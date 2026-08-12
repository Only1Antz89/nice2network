export type MatchInput={memberSkills:string[];memberInterests:string[];memberIndustry?:string|null;projectSkills:string[];projectIndustry:string;projectTags:string[];distanceKm?:number;feedbackAffinity?:number};
export function scoreMatch(input:MatchInput){
  const normal=(values:string[])=>new Set(values.map(v=>v.trim().toLowerCase()));
  const skills=normal(input.memberSkills), interests=normal(input.memberInterests);
  const skillOverlap=input.projectSkills.filter(v=>skills.has(v.toLowerCase())).length/Math.max(input.projectSkills.length,1);
  const interestOverlap=input.projectTags.filter(v=>interests.has(v.toLowerCase())).length/Math.max(input.projectTags.length,1);
  const industryFit=input.memberIndustry?.toLowerCase()===input.projectIndustry.toLowerCase()?1:0;
  const proximity=input.distanceKm==null ? .5 : Math.max(0,1-input.distanceKm/80);
  const learned=Math.max(-1,Math.min(1,input.feedbackAffinity??0));
  const features={skills:skillOverlap,interests:interestOverlap,industry:industryFit,proximity,learned};
  const raw=skillOverlap*.4+interestOverlap*.2+industryFit*.15+proximity*.1+((learned+1)/2)*.15;
  const score=Math.round(raw*100);
  const reasons=Object.entries(features).filter(([,value])=>value>.45).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([key])=>({skills:"Relevant skills",interests:"Shared interests",industry:"Industry experience",proximity:"Nearby",learned:"Matches you found useful"}[key]));
  return {score,reasons,features};
}
