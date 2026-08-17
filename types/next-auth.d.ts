import "next-auth";

declare module "next-auth" {
  interface Session { user: { id: string; name?: string | null; email?: string | null; image?: string | null; isN2Admin: boolean; forcePasswordChange: boolean } }
}

declare module "next-auth/jwt" { interface JWT { userId?: string; isN2Admin?: boolean; forcePasswordChange?: boolean; authVersion?: string; authValid?: boolean } }
