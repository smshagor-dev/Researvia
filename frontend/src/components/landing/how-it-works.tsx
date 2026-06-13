import { Mail, MessageCircleReply, Search, Sparkles } from 'lucide-react';

const steps = [
  { title: 'Find Professors', description: 'Search verified professor profiles and shortlist the best research fit.', icon: Search },
  { title: 'Generate Email', description: 'Use AI to draft personalized emails based on your goals and professor data.', icon: Sparkles },
  { title: 'Send & Track', description: 'Send outreach, schedule follow-ups, and monitor opens from the CRM.', icon: Mail },
  { title: 'Get Response', description: 'Keep replies, scholarships, and next actions organized until you move forward.', icon: MessageCircleReply },
];

export function HowItWorks() {
  return (
    <section id="solutions" className="border-y border-slate-200 bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">How it works</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Simple Steps to Reach Your Goals</h2>
        </div>

        <div className="relative mt-14 grid gap-4 md:grid-cols-4">
          <div className="absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent md:block" />
          {steps.map(({ title, description, icon: Icon }, index) => (
            <article key={title} className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/20">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wide text-indigo-600">Step {index + 1}</span>
              <h3 className="mt-2 text-lg font-bold text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
