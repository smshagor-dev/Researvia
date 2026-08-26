import { WatchlistManager } from "@/components/watchlists/WatchlistManager";
import { getCurrentUser } from "@/server/auth/session";
import { listWatchlists } from "@/server/workspace/workspace.service";

export default async function WatchlistsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const items = await listWatchlists(user.id);
  return <div className="space-y-6"><div><p className="text-sm font-medium text-slate-500">Academic monitoring</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Watchlists & alerts</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Monitor scholarships, opportunities, professors, research labs, and recorded deadline changes without relying on a paid notification provider.</p></div><WatchlistManager initialItems={items.map((item) => ({ id: item._id.toString(), name: item.name, targetType: item.targetType, query: item.query, countries: item.countries, researchTopics: item.researchTopics, fundingTypes: item.fundingTypes, enabled: item.enabled, lastEvaluatedAt: item.lastEvaluatedAt ? new Date(item.lastEvaluatedAt).toISOString() : null, lastMatchedAt: item.lastMatchedAt ? new Date(item.lastMatchedAt).toISOString() : null }))}/></div>;
}
