import type { Metadata } from "next";
import { PwaRegistration } from "@/components/pwa/PwaRegistration";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: process.env.APP_URL ? new URL(process.env.APP_URL) : undefined,
  title: {
    default: "ResearVia",
    template: "%s | ResearVia"
  },
  description: "Free professor, scholarship, research opportunity, and academic outreach platform for students.",
  manifest: "/manifest.webmanifest",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "ResearVia",
    title: "ResearVia",
    description: "Free academic opportunity and research discovery workspace for students."
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><PwaRegistration />{children}</body>
    </html>
  );
}
