import { createHash, randomBytes } from "node:crypto";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { isSecureRequest } from "@/lib/http";
import { enforceRateLimit, RateLimitError, requestIp } from "@/lib/rate-limit";

const schema=z.object({email:z.email().transform(value=>value.trim().toLowerCase()),password:z.string().min(10).max(200)});
export async function POST(request:Request){try{const input=schema.safeParse(await request.json());if(!input.success)return NextResponse.json({resume:false});enforceRateLimit(`onboarding-resume:${requestIp(request)}:${input.data.email}`,6,15*60_000);const db=getDb(),[member]=await db.select({passwordHash:users.passwordHash,status:users.status}).from(users).where(eq(users.email,input.data.email)).limit(1);if(!member?.passwordHash||!["pending_onboarding","onboarding"].includes(member.status)||!await compare(input.data.password,member.passwordHash))return NextResponse.json({resume:false});const token=randomBytes(32).toString("base64url"),identifier=`onboarding:${input.data.email}`;await db.delete(verificationTokens).where(eq(verificationTokens.identifier,identifier));await db.insert(verificationTokens).values({identifier,token:createHash("sha256").update(token).digest("hex"),expires:new Date(Date.now()+24*60*60*1000)});const response=NextResponse.json({resume:true});response.cookies.set("n2_onboarding",token,{httpOnly:true,sameSite:"lax",secure:isSecureRequest(request),maxAge:24*60*60,path:"/"});return response}catch(error){return NextResponse.json({resume:false},{status:error instanceof RateLimitError?429:500})}}
