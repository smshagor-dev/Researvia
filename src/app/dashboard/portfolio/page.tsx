import { PublicPortfolioManager } from "@/components/portfolio/PublicPortfolioManager";
import { getCurrentUser } from "@/server/auth/session";
import { getOwnPortfolio } from "@/server/portfolio/portfolio.service";

function suggestedSlug(displayName:string){return displayName.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,100)||"student-profile";}

export default async function PortfolioPage(){
  const user=await getCurrentUser();
  if(!user)return null;
  const profile=await getOwnPortfolio(user.id);
  const initialValue={
    slug:profile?.slug??suggestedSlug(user.displayName),
    enabled:profile?.enabled??false,
    headline:profile?.headline??"",
    summary:profile?.summary??"",
    showInterests:profile?.showInterests??true,
    showSkills:profile?.showSkills??true,
    showPublications:profile?.showPublications??true,
    showProjects:profile?.showProjects??true,
    showAcademicLinks:profile?.showAcademicLinks??true,
    allowCvDownload:profile?.allowCvDownload??false
  };
  return <div className="space-y-6"><div><p className="text-sm font-medium text-slate-500">Academic identity</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Public portfolio</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Create an optional public academic profile with granular section controls. Nothing is published until you explicitly enable it.</p></div><PublicPortfolioManager initialValue={initialValue} appUrl={process.env.APP_URL||"http://localhost:3000"}/></div>;
}
