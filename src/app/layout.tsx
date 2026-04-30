import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HumanizeIt — Make AI Text Undetectable | Bypass GPTZero & Turnitin",
  description: "Transform AI-generated text into natural, human-sounding writing in seconds. Bypass GPTZero, Turnitin, and Originality.AI. Powered by GPT-4o. Free to start.",
  keywords: "humanize AI text, bypass GPTZero, bypass Turnitin, AI text detector, make AI writing undetectable, ChatGPT essay humanizer, AI content humanizer",
  authors: [{ name: "HumanizeIt" }],
  metadataBase: new URL("https://humanizeit.net"),
  openGraph: {
    title: "HumanizeIt — Make AI Text Undetectable",
    description: "Transform AI-generated text into natural human writing. Bypass GPTZero, Turnitin & more. Free to start.",
    url: "https://humanizeit.net",
    siteName: "HumanizeIt",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "HumanizeIt — Make AI Text Undetectable",
    description: "Transform AI-generated text into natural human writing. Bypass GPTZero, Turnitin & more. Free to start.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: "https://humanizeit.net",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased bg-[#0a0a0a] font-[family-name:var(--font-inter)]">
        {children}
      </body>
    </html>
  );
}