'use client';

import { useState } from 'react';
import {
  useAdminBackups,
  useAdminSystemAlerts,
  useAdminSystemHealth,
  useAdminSystemMetrics,
  useAdminSystemQueues,
  useAdminSystemWorkers,
  useRestoreBackup,
  useRunBackup,
} from '@/lib/hooks';
import { Activity, AlertTriangle, Database, HardDrive, HeartPulse, Loader2, RefreshCcw, RotateCcw, ShieldAlert, Trash2, Users } from 'lucide-react';

const tabs = ['Health', 'Queues', 'Workers', 'Backups', 'Alerts', 'Metrics'] as const;

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : 'Never';
}

export default function AdminSystemPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Health');
  const healthQuery = useAdminSystemHealth();
  const queuesQuery = useAdminSystemQueues();
  const workersQuery = useAdminSystemWorkers();
  const backupsQuery = useAdminBackups();
  const alertsQuery = useAdminSystemAlerts();
  const metricsQuery = useAdminSystemMetrics();
  const runBackup = useRunBackup();
  const restoreBackup = useRestoreBackup();

  const health = (healthQuery.data as any) || {};
  const queues = ((queuesQuery.data as any) || []) as Array<any>;
  const workers = (((workersQuery.data as any) || {}).items || []) as Array<any>;
  const backups = ((backupsQuery.data as any) || []) as Array<any>;
  const alerts = ((alertsQuery.data as any) || []) as Array<any>;
  const metrics = (metricsQuery.data as any) || {};

  const refreshAll = () => {
    healthQuery.refetch();
    queuesQuery.refetch();
    workersQuery.refetch();
    backupsQuery.refetch();
    alertsQuery.refetch();
    metricsQuery.refetch();
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">System Control Center</h1>
          <p className="mt-1 text-sm text-slate-400">
            Public beta launch readiness across infrastructure health, queue pressure, worker reliability, backups, alerts, and live metrics.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshAll}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-6">
        <SummaryCard icon={HeartPulse} label="Overall" value={health.overallStatus || 'unknown'} />
        <SummaryCard icon={Database} label="Database" value={health.database?.status || 'unknown'} />
        <SummaryCard icon={HardDrive} label="Storage" value={health.storage?.status || 'unknown'} />
        <SummaryCard icon={Users} label="Workers" value={String(health.workers?.healthyWorkers ?? 0)} hint={`of ${health.workers?.requiredWorkers ?? 0}`} />
        <SummaryCard icon={ShieldAlert} label="Alerts" value={String(alerts.length)} />
        <SummaryCard icon={Activity} label="Queue Depth" value={String(metrics.queueDepth ?? 0)} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab
                ? 'bg-sky-500 text-slate-950'
                : 'border border-white/10 bg-white/[0.03] text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Health' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Dependency Health">
            <HealthRows
              items={[
                ['Database', health.database],
                ['Redis', health.redis],
                ['Storage', health.storage],
                ['Stripe', health.stripe],
                ['SMTP', health.smtp],
                ['OpenAI', health.aiProviders?.openai],
                ['Anthropic', health.aiProviders?.anthropic],
              ]}
            />
          </Panel>
          <Panel title="Recommendations">
            <div className="space-y-3">
              {((health.recommendations as string[]) || []).map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === 'Queues' ? (
        <Panel title="Queues">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm text-slate-200">
              <thead className="border-b border-white/10 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-3">Queue</th>
                  <th className="px-3 py-3">Active</th>
                  <th className="px-3 py-3">Waiting</th>
                  <th className="px-3 py-3">Failed</th>
                  <th className="px-3 py-3">Latency</th>
                  <th className="px-3 py-3">Last Success</th>
                  <th className="px-3 py-3">Last Failure</th>
                </tr>
              </thead>
              <tbody>
                {queues.map((queue) => (
                  <tr key={queue.queueName} className="border-b border-white/5">
                    <td className="px-3 py-3 font-medium text-white">{queue.queueName}</td>
                    <td className="px-3 py-3">{queue.counts.active}</td>
                    <td className="px-3 py-3">{queue.counts.waiting + queue.counts.delayed}</td>
                    <td className="px-3 py-3 text-rose-300">{queue.counts.failed}</td>
                    <td className="px-3 py-3">{queue.queueLatencyMs}ms</td>
                    <td className="px-3 py-3">{formatDate(queue.lastSuccessfulJobAt)}</td>
                    <td className="px-3 py-3">{formatDate(queue.lastFailedJobAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {activeTab === 'Workers' ? (
        <Panel title="Workers">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workers.map((worker) => (
              <div key={worker.queueName} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{worker.queueName}</p>
                    <p className="text-xs text-slate-500">{worker.workerName}</p>
                  </div>
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs capitalize text-slate-200">{worker.effectiveStatus}</span>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <p>Heartbeat: {formatDate(worker.lastHeartbeatAt)}</p>
                  <p>Last Job: {formatDate(worker.lastJobProcessedAt)}</p>
                  <p>Host: {worker.hostname || 'N/A'} / pid {worker.processId ?? 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {activeTab === 'Backups' ? (
        <div className="space-y-4">
          <Panel title="Run Backup">
            <div className="flex flex-wrap gap-3">
              {['database', 'storage', 'configuration', 'full_snapshot'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => runBackup.mutate(type)}
                  disabled={runBackup.isPending}
                  className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 disabled:opacity-60"
                >
                  {runBackup.isPending ? <Loader2 className="inline h-4 w-4 animate-spin" /> : null}
                  {!runBackup.isPending ? `Run ${type.replace('_', ' ')}` : ' Running...'}
                </button>
              ))}
            </div>
          </Panel>
          <Panel title="Backup Jobs">
            <div className="space-y-3">
              {backups.map((backup) => (
                <div key={backup.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div>
                    <p className="font-semibold capitalize text-white">{String(backup.type).replace('_', ' ')}</p>
                    <p className="text-sm text-slate-400">{backup.status} · started {formatDate(backup.startedAt)}</p>
                    <p className="text-xs text-slate-500">{backup.location || 'Pending artifact location'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => restoreBackup.mutate(backup.id)}
                    disabled={restoreBackup.isPending || !backup.location}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {restoreBackup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === 'Alerts' ? (
        <Panel title="Alerts">
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.key} className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-300" />
                  <p className="font-semibold capitalize text-white">{alert.severity}</p>
                </div>
                <p className="mt-2 text-sm text-slate-200">{alert.message}</p>
              </div>
            ))}
            {!alerts.length ? <p className="text-sm text-slate-500">No active alerts.</p> : null}
          </div>
        </Panel>
      ) : null}

      {activeTab === 'Metrics' ? (
        <Panel title="Metrics Summary">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Queue Depth" value={metrics.queueDepth ?? 0} />
            <MetricCard label="Failed Jobs" value={metrics.failedJobs ?? 0} />
            <MetricCard label="Healthy Workers" value={metrics.healthyWorkers ?? 0} />
            <MetricCard label="Offline Workers" value={metrics.offlineWorkers ?? 0} />
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
            Raw Prometheus metrics are available at <code>/metrics</code>.
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: any;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="h-4 w-4" />
        <p className="text-xs uppercase tracking-[0.2em]">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold capitalize text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function HealthRows({ items }: { items: Array<[string, any]> }) {
  return (
    <div className="space-y-3">
      {items.map(([label, item]) => (
        <div key={label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div>
            <p className="font-medium text-white">{label}</p>
            <p className="text-xs text-slate-500">{item?.latencyMs != null ? `${item.latencyMs}ms` : item?.message || 'No latency probe available'}</p>
          </div>
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs capitalize text-slate-200">{item?.status || 'unknown'}</span>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
