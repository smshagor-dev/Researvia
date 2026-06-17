import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/shared/providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: { default: 'ResearVia - Academic Outreach Platform', template: '%s | ResearVia' },
  description: 'Discover professors, scholarships, and research opportunities, then manage outreach and application workflows in ResearVia.',
  keywords: [
    'AI academic communication',
    'professor outreach',
    'scholarship search',
    'academic CRM',
    'PhD application',
    'research email writer',
  ],
  openGraph: {
    type: 'website',
    title: 'ResearVia - Academic Outreach Platform',
    description: 'A platform for professor discovery, scholarship search, AI-assisted outreach, and research opportunity tracking.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
