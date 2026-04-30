import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HumanizeAI — Make AI Text Sound Human",
  description: "Paste AI-generated text and get a natural, human-sounding rewrite powered by GPT-4o.",
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
