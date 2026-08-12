import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db";
import { accounts, authenticators, sessions, users, verificationTokens } from "@/db/schema";

const providers = [];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google);
if (process.env.AUTH_MICROSOFT_ENTRA_ID_ID && process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET) providers.push(MicrosoftEntraID);
providers.push(Credentials({
  credentials: { email: {}, password: { type: "password" } },
  async authorize(credentials) {
    if (!isDatabaseConfigured() || typeof credentials.email !== "string" || typeof credentials.password !== "string") return null;
    const [member] = await getDb().select().from(users).where(eq(users.email, credentials.email.trim().toLowerCase())).limit(1);
    if (!member?.passwordHash || member.status !== "active" || !(await compare(credentials.password, member.passwordHash))) return null;
    return { id: member.id, email: member.email, name: member.name, image: member.image };
  },
}));

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: isDatabaseConfigured() ? DrizzleAdapter(getDb(), { usersTable: users, accountsTable: accounts, sessionsTable: sessions, verificationTokensTable: verificationTokens, authenticatorsTable: authenticators }) : undefined,
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    jwt({ token, user }) { if (user?.id) token.userId = user.id; return token; },
    session({ session, token }) { if (session.user) session.user.id = String(token.userId ?? token.sub); return session; },
  },
});
