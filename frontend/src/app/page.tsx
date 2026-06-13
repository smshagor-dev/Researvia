import { CTA } from '@/components/landing/CTA';
import { Features } from '@/components/landing/Features';
import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Pricing } from '@/components/landing/Pricing';
import { Stats } from '@/components/landing/Stats';
import { Testimonials } from '@/components/landing/Testimonials';
import { TrustedLogos } from '@/components/landing/TrustedLogos';

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-950 dark:bg-[#050816] dark:text-white">
      <Header />
      <Hero />
      <TrustedLogos />
      <Features />
      <HowItWorks />
      <Stats />
      <Pricing />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  );
}
