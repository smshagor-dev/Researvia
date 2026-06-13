const stats = [
  { value: '100M+', label: 'Professors in Database' },
  { value: '50K+', label: 'Universities Covered' },
  { value: '500K+', label: 'Emails Sent' },
  { value: '95%', label: 'Email Delivery Rate' },
];

export function StatsSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-blue-700 p-8 text-white shadow-2xl shadow-indigo-900/20 sm:p-10 lg:p-12">
        <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-100">Global academic network</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Built for serious academic outreach at scale.</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="mt-2 text-sm font-medium text-indigo-100">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
