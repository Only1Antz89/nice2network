import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { compare } from "bcryptjs";
import { createHmac } from "node:crypto";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db";
import { accounts, adminAssignments, authenticators, sessions, users, verificationTokens } from "@/db/schema";
import { enforceRateLimit, RateLimitError, requestIp } from "@/lib/rate-limit";
import { enforceDistributedRateLimit } from "@/lib/distributed-rate-limit";
import { reconcileExpiredSuspension } from "@/lib/admin-account-lifecycle";

class SignInRateLimited extends CredentialsSignin {
  code = "rate_limit";
}

class AccountDeactivated extends CredentialsSignin {
  code = "account_deactivated";
}

function authVersion(passwordHash: string | null, sessionVersion: number) {
  return createHmac("sha256", process.env.AUTH_SECRET!).update(`${passwordHash ?? "oauth-only"}:${sessionVersion}`).digest("base64url");
}

const providers = [];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google);
if (process.env.AUTH_MICROSOFT_ENTRA_ID_ID && process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET) providers.push(MicrosoftEntraID);
providers.push(Credentials({
  credentials: { email: {}, password: { type: "password" } },
  async authorize(credentials, request) {
    if (!isDatabaseConfigured() || typeof credentials.email !== "string" || typeof credentials.password !== "string") return null;
    const email = credentials.email.trim().toLowerCase();
    let [member] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
    if (member?.status === "suspended" && member.suspendedUntil && member.suspendedUntil <= new Date()) {
      await reconcileExpiredSuspension(member.id);
      [member] = await getDb().select().from(users).where(eq(users.id, member.id)).limit(1);
    }
    const passwordMatches = Boolean(member?.passwordHash && await compare(credentials.password, member.passwordHash));
    if (passwordMatches && member?.status === "active") {
      // Profile images can be embedded data URLs and are far too large for a JWT
      // session cookie. Profile APIs remain the source of truth for member media.
      return { id: member.id, email: member.email, name: member.name };
    }
    if (passwordMatches && member?.status === "deactivated" && member.recoveryDeadline && member.recoveryDeadline > new Date()) throw new AccountDeactivated();

    // Count failed credentials only. A correct password must remain usable after
    // repeated failures, otherwise an attacker can lock another member out.
    try {
      enforceRateLimit(`signin:${requestIp(request)}:${email}`, 8, 15 * 60_000);
      await enforceDistributedRateLimit(`signin:${requestIp(request)}:${email}`, 8, 15 * 60_000);
    } catch (error) {
      if (error instanceof RateLimitError) throw new SignInRateLimited();
      throw error;
    }
    return null;
  },
}));

export const { handlers, auth, signIn, signOut } = NextAuth({
  // With no database there are no accounts to authenticate; a fixed preview-only
  // secret lets the public shell read an empty session without weakening a
  // configured deployment, where AUTH_SECRET remains mandatory.
  secret: process.env.AUTH_SECRET ?? (!isDatabaseConfigured() ? "nice-2-network-unconfigured-preview" : undefined),
  trustHost: Boolean(process.env.VERCEL || process.env.AUTH_TRUST_HOST === "true" || process.env.NODE_ENV !== "production"),
  adapter: isDatabaseConfigured() ? DrizzleAdapter(getDb(), { usersTable: users, accountsTable: accounts, sessionsTable: sessions, verificationTokensTable: verificationTokens, authenticatorsTable: authenticators }) : undefined,
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, user }) {
      // Never serialize profile media into auth cookies. This also protects OAuth
      // users who replace a provider URL with an embedded profile image later.
      token.picture = undefined;
      if (user?.id) token.userId = user.id;
      const userId = String(token.userId ?? token.sub ?? "");
      if (userId && isDatabaseConfigured()) {
        const now = new Date();
        const [memberRows, adminRows] = await Promise.all([
          getDb().select({ forcePasswordChange: users.forcePasswordChange, passwordHash: users.passwordHash, sessionVersion: users.sessionVersion, status: users.status, suspendedUntil: users.suspendedUntil }).from(users).where(eq(users.id, userId)).limit(1),
          getDb().select({ id: adminAssignments.id }).from(adminAssignments).where(and(eq(adminAssignments.userId, userId), eq(adminAssignments.status, "active"), or(isNull(adminAssignments.expiresAt), gt(adminAssignments.expiresAt, now)))).limit(1),
        ]);
        let [member] = memberRows;
        const [admin] = adminRows;
        if (member?.status === "suspended" && member.suspendedUntil && member.suspendedUntil <= now) {
          await reconcileExpiredSuspension(userId, now);
          [member] = await getDb().select({ forcePasswordChange: users.forcePasswordChange, passwordHash: users.passwordHash, sessionVersion: users.sessionVersion, status: users.status, suspendedUntil: users.suspendedUntil }).from(users).where(eq(users.id, userId)).limit(1);
        }
        const currentVersion = member ? authVersion(member.passwordHash, member.sessionVersion) : "";
        if (user?.id) token.authVersion = currentVersion;
        token.authValid = Boolean(member?.status === "active" && token.authVersion === currentVersion);
        token.forcePasswordChange = token.authValid ? member?.forcePasswordChange ?? false : false;
        token.isN2Admin = token.authValid && Boolean(admin);
        if (!token.authValid) token.userId = undefined;
      }
      return token;
    },
    session({ session, token }) { if (session.user) { session.user.id = token.authValid ? String(token.userId ?? token.sub ?? "") : ""; session.user.isN2Admin = Boolean(token.isN2Admin); session.user.forcePasswordChange = Boolean(token.forcePasswordChange); } return session; },
  },
});
