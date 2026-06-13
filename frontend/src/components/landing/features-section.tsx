import { ArrowRight, BookOpen, Bot, MailCheck, Search, ShieldCheck } from 'lucide-react';

const features = [
  {
    icon: Search,
    title: 'Discover Professors',
    description: 'Search by research area, university, country, publications, and fit signals to build a smarter shortlist.',
  },
  {
    icon: Bot,
    title: 'AI Email Writer',
    description: 'Generate concise, personalized academic emails that reference the professor, lab, and your research goals.',
  },
  {
    icon: MailCheck,
    title: 'Email CRM',
    description: 'Track sent emails, opens, replies, follow-ups, and full conversation history from one organized workspace.',
  },
  {
    icon: BookOpen,
    title: 'Scholarship Finder',
    description: 'Discover funding opportunities, save deadlines, and manage applications alongside your outreach pipeline.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure & Verified',
    description: 'Protect credentials, verify communication data, and keep your academic outreach workflow reliable.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Features</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Everything You Need for Academic Success</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            A professional academic communication system for discovery, writing, tracking, and follow-through.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {features.map(({ icon: Icon, title, description }) => (
            <article key={title} className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-950/8">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 transition group-hover:bg-indigo-600 group-hover:text-white">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              <a href="#solutions" className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 transition hover:text-indigo-700">
                Learn more <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
