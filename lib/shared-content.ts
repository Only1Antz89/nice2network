import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects, timelinePosts, users } from "@/db/schema";

export type SharedContent = {
  id:string;kind:"post"|"project";title:string;description:string;authorName:string;
  authorProfession:string|null;image:string|null;accent:string;createdAt:Date;
};

export async function getSharedContent(kind:string,id:string):Promise<SharedContent|null>{
  const db=getDb();
  if(kind==="post"){
    const [row]=await db.select({id:timelinePosts.id,body:timelinePosts.body,attachmentType:timelinePosts.attachmentType,attachmentUrl:timelinePosts.attachmentUrl,createdAt:timelinePosts.createdAt,authorName:users.name,authorProfession:users.profession}).from(timelinePosts).innerJoin(users,eq(users.id,timelinePosts.authorId)).where(and(eq(timelinePosts.id,id),eq(timelinePosts.status,"visible"),eq(timelinePosts.visibility,"network"),eq(users.status,"active"))).limit(1);
    if(!row)return null;
    const author=row.authorName??"an n2 member";
    return {id:row.id,kind:"post",title:`Post by ${author}`,description:row.body,authorName:author,authorProfession:row.authorProfession,image:row.attachmentType==="image"?row.attachmentUrl:null,accent:"#111111",createdAt:row.createdAt};
  }
  if(kind==="project"){
    const [row]=await db.select({id:projects.id,title:projects.title,summary:projects.summary,imageUrl:projects.imageUrl,accent:projects.accent,createdAt:projects.createdAt,ownerName:users.name,ownerProfession:users.profession}).from(projects).innerJoin(users,eq(users.id,projects.ownerId)).where(and(eq(projects.id,id),eq(projects.status,"active"),eq(projects.visibility,"network"),eq(users.status,"active"))).limit(1);
    if(!row)return null;
    return {id:row.id,kind:"project",title:row.title,description:row.summary,authorName:row.ownerName??"an n2 member",authorProfession:row.ownerProfession,image:row.imageUrl,accent:row.accent,createdAt:row.createdAt};
  }
  return null;
}

export function previewDescription(value:string,max=220){
  const clean=value.replace(/\s+/g," ").trim();
  return clean.length<=max?clean:`${clean.slice(0,max-1).trimEnd()}…`;
}
