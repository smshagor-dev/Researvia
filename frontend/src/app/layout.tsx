import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/shared/providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: { default: 'ProfCRM - AI Academic Communication Platform', template: '%s | ProfCRM' },
  description: 'Find professors, discover scholarships, generate personalized academic emails, and track communication with ProfCRM.',
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
    title: 'ProfCRM - AI Academic Communication Platform',
    description: 'A premium platform for professor discovery, scholarship search, AI email writing, and academic outreach tracking.',
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
