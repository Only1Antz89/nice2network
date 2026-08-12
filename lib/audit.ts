import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { auditLog } from "@/db/schema";

export async function audit(actorId:string|null,action:string,targetType:string,targetId?:string,metadata:Record<string,unknown>={}){
  const requestHeaders=await headers();
  const rawIp=requestHeaders.get("x-forwarded-for")?.split(",")[0]??"unknown";
  const ipHash=createHash("sha256").update(`${process.env.AUTH_SECRET??"local"}:${rawIp}`).digest("hex");
  await getDb().insert(auditLog).values({actorId,action,targetType,targetId,metadata,ipHash});
}
