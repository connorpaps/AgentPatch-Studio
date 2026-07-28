import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentPatch Studio",
  description:
    "Debugging, replay, comparison, and evaluation for AI agent workflows. Trace every run, reproduce failures, ship fixes with confidence.",
  applicationName: "AgentPatch Studio",
  keywords: [
    "AI observability",
    "agent tracing",
    "LLM debugging",
    "agent replay",
    "evaluation framework",
    "production agents",
  ],
  openGraph: {
    title: "AgentPatch Studio",
    description:
      "Trace every agent run. Reproduce failures. Ship fixes with confidence.",
    type: "website",
    url: "https://agent-patch-studio-web.vercel.app/",
    siteName: "AgentPatch Studio",
  },
  twitter: {
    card: "summary",
    title: "AgentPatch Studio",
    description:
      "Trace every agent run. Reproduce failures. Ship fixes with confidence.",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
