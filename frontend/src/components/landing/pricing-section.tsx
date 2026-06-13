import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'For students starting their search.',
    features: ['20 Credits/month', '5 Email Reveals', 'AI Email Generation', 'Basic Search Filters', 'Email Tracking'],
  },
  {
    name: 'Starter',
    price: '$9.99',
    description: 'For active professor outreach.',
    popular: true,
    features: ['100 Credits/month', '20 Email Reveals', 'AI Email Generation', 'Advanced Search Filters', 'Email Tracking', 'Priority Support'],
  },
  {
    name: 'Pro',
    price: '$29.99',
    description: 'For high-volume applications.',
    features: ['500 Credits/month', '100 Email Reveals', 'AI Email Generation', 'Bulk Email Sending', 'Email Tracking', 'Priority Support'],
  },
  {
    name: 'Enterprise',
    price: '$99.99',
    description: 'For teams and advisors.',
    features: ['2000 Credits/month', 'Unlimited Email Reveals', 'All Pro Features', 'Team Management', 'Dedicated Support', 'Custom Integrations'],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Choose the Perfect Plan for You</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">Start free and upgrade when your outreach volume grows.</p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-4">
          {plans.map((plan) => (
            <article key={plan.name} className={`relative rounded-2xl border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${plan.popular ? 'border-indigo-500 bg-indigo-50/60 shadow-indigo-950/10' : 'border-slate-200 bg-white'}`}>
              {plan.popular && (
                <span className="absolute right-5 top-5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-bold text-slate-950">{plan.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{plan.description}</p>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-4xl font-bold text-slate-950">{plan.price}</span>
                <span className="pb-1 text-sm font-semibold text-slate-500">/month</span>
              </div>
              <Link href="/register" className={`mt-6 inline-flex w-full justify-center rounded-md px-4 py-3 text-sm font-bold transition ${plan.popular ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border border-slate-200 bg-white text-slate-900 hover:border-indigo-200 hover:bg-indigo-50'}`}>
                Get Started
              </Link>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
