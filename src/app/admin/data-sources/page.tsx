import { DataSourcesConsole } from "@/components/admin/DataSourcesConsole";
import { requireAdmin } from "@/server/admin/admin.service";
import { listFeedSources } from "@/server/feeds/feed.service";

export default async function DataSourcesPage() {
  await requireAdmin();
  const sources = await listFeedSources();
  return <div className="space-y-6"><div><p className="text-sm font-medium text-slate-500">Research data operations</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Data sources</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Manage reviewed academic feeds and open scholarly metadata providers without introducing a paid API dependency.</p></div><DataSourcesConsole initialSources={sources.map((source) => ({ id: source._id.toString(), name: source.name, entityType: source.entityType, format: source.format, url: source.url, defaultCountry: source.defaultCountry, defaultProvider: source.defaultProvider, active: source.active, lastSyncedAt: source.lastSyncedAt ? new Date(source.lastSyncedAt).toISOString() : null, lastError: source.lastError }))}/></div>;
}
