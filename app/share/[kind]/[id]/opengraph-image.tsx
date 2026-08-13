import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getSharedContent, previewDescription } from "@/lib/shared-content";

export const size={width:1200,height:630};
export const contentType="image/png";
export const alt="Shared content on nice 2 network";

export default async function OpenGraphImage({params}:{params:Promise<{kind:string;id:string}>}){
  const {kind,id}=await params,content=await getSharedContent(kind,id);if(!content)notFound();
  const hasImage=Boolean(content.image),copy=previewDescription(content.kind==="post"?content.description:content.title,hasImage?250:360);
  return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",background:"#f7f7f4",color:"#111",fontFamily:"Arial, sans-serif",padding:"58px"}}><div style={{width:hasImage?"62%":"100%",display:"flex",flexDirection:"column",paddingRight:hasImage?"52px":"0"}}><div style={{display:"flex",alignItems:"center",gap:"15px",fontSize:"26px",fontWeight:700}}><span style={{width:"54px",height:"54px",borderRadius:"50%",background:"#111",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px"}}>n2</span>nice 2 network</div><div style={{display:"flex",marginTop:"62px",fontSize:"16px",letterSpacing:"5px",textTransform:"uppercase",color:"#666"}}>{content.kind} · shared by {content.authorName}</div><div style={{display:"flex",marginTop:"22px",fontSize:hasImage?"44px":"53px",fontWeight:700,lineHeight:1.15,letterSpacing:"-1.5px"}}>{copy}</div><div style={{display:"flex",alignItems:"center",gap:"10px",marginTop:"auto",fontSize:"21px"}}><span style={{width:"62px",height:"7px",borderRadius:"9px",background:content.accent}}/>Ideas need good people.</div></div>{hasImage&&<div style={{width:"38%",height:"100%",display:"flex",borderRadius:"26px",overflow:"hidden",background:"#111"}}><img src={content.image!} alt="" width="100%" height="100%" style={{objectFit:"cover"}}/></div>}</div>,size);
}
