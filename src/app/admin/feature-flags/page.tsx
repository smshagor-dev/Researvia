import { FeatureFlagConsole } from "@/components/admin/FeatureFlagConsole";
import { requireAdmin } from "@/server/admin/admin.service";
import { listFeatureFlags } from "@/server/admin/platform.service";

export default async function FeatureFlagsPage(){await requireAdmin();const flags=await listFeatureFlags();return <div className="space-y-6"><div><p className="text-sm font-medium text-slate-500">Controlled rollout</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Feature Flags</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Enable or stage platform capabilities without changing monetization: ResearVia remains free for students.</p></div><FeatureFlagConsole initialFlags={flags.map(flag=>({id:flag._id.toString(),key:flag.key,description:flag.description,enabled:flag.enabled,environments:flag.environments,allowedRoles:flag.allowedRoles,rolloutPercent:flag.rolloutPercent}))}/></div>}
