import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ResearVia",
    template: "%s | ResearVia"
  },
  description: "Free professor, scholarship, research opportunity, and academic outreach platform for students."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
