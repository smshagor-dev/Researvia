import type { DeadlineState } from "@/server/opportunities/opportunity.service";

const labels: Record<DeadlineState, string> = { OPEN: "Open", CLOSING_SOON: "Closing soon", CLOSED: "Closed", UNKNOWN: "Deadline unknown" };
const classes: Record<DeadlineState, string> = { OPEN: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", CLOSING_SOON: "bg-amber-50 text-amber-700 ring-amber-600/20", CLOSED: "bg-slate-100 text-slate-500 ring-slate-500/20", UNKNOWN: "bg-blue-50 text-blue-700 ring-blue-600/20" };
export function DeadlineBadge({ state }: { state: DeadlineState }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${classes[state]}`}>{labels[state]}</span>; }
