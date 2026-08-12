import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { auditLog } from "@/db/schema";

export async function audit(actorId:string|null,action:string,targetType:string,targetId?:string,metadata:Record<string,unknown>={},details:{permission?:string;reason?:string;severity?:string;before?:Record<string,unknown>;after?:Record<string,unknown>}={}){
  const requestHeaders=await headers();
  const rawIp=requestHeaders.get("x-forwarded-for")?.split(",")[0]??"unknown";
  const requestId=requestHeaders.get("x-vercel-id")??requestHeaders.get("x-request-id")??crypto.randomUUID();
  const ipHash=createHash("sha256").update(`${process.env.AUTH_SECRET??"local"}:${rawIp}`).digest("hex");
  await getDb().insert(auditLog).values({actorId,action,targetType,targetId,metadata,ipHash,requestId,...details});
}
