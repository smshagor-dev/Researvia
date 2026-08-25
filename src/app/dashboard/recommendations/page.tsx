import { AIWorkspace } from "@/components/ai/AIWorkspace";

export default function RecommendationsPage() {
  return <div className="space-y-6"><div><p className="text-sm font-medium text-slate-500">Decision support</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Recommendations & writing tools</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Find stronger-fit professors, scholarships, and opportunities, then prepare fact-grounded academic drafts. Core tools remain usable without a paid AI service.</p></div><AIWorkspace /></div>;
}
