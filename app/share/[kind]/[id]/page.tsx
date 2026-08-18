import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSharedContent, previewDescription } from "@/lib/shared-content";

const origin="https://nice2network.vercel.app";

export async function generateMetadata({params}:{params:Promise<{kind:string;id:string}>}):Promise<Metadata>{
  const {kind,id}=await params,content=await getSharedContent(kind,id);
  if(!content)return {title:"Content unavailable — nice 2 network",robots:{index:false,follow:false}};
  const description=previewDescription(content.description),canonical=`${origin}/share/${content.kind}/${content.id}`,image=`${canonical}/opengraph-image`;
  return {
    title:`${content.title} — nice 2 network`,description,alternates:{canonical},robots:{index:true,follow:true},
    openGraph:{type:"article",url:canonical,siteName:"nice 2 network",title:content.title,description,publishedTime:content.createdAt.toISOString(),authors:[content.authorName],images:[{url:image,width:1200,height:630,alt:`${content.title} on nice 2 network`}]},
    twitter:{card:"summary_large_image",title:content.title,description,images:[image]},
    other:{"og:image:secure_url":image,"og:image:type":"image/png","twitter:label1":"Shared by","twitter:data1":content.authorName},
  };
}

export default async function SharedContentPage({params}:{params:Promise<{kind:string;id:string}>}){
  const {kind,id}=await params,content=await getSharedContent(kind,id);if(!content)notFound();
  const destination=`/?${content.kind}=${content.id}`;
  return <main className="shared-content-page"><header><Link href="/" className="shared-logo"><b>n2</b><span>nice 2 network</span></Link><div><Link href="/signin">Sign in</Link><Link href="/signin?mode=register">Join n2</Link></div></header><article className={`shared-${content.kind}`}><span className="share-content-kind">{content.kind}</span><h1>{content.kind==="post"?content.description:content.title}</h1>{content.kind==="project"&&<p>{content.description}</p>}{content.image&&<Image src={content.image} alt="Shared post attachment" width={1200} height={630} sizes="(max-width: 760px) 100vw, 760px" unoptimized/>}<footer><span><b>{content.authorName}</b><small>{content.authorProfession??"n2 member"}</small></span><Link href={destination}>Open on n2 →</Link></footer></article><section><b>Ideas need good people.</b><p>Discover useful people, practical projects and conversations worth joining.</p><Link href="/signin?mode=register">Join the network</Link></section></main>;
}
