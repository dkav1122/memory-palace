import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ColorThemeSync } from "@/components/ColorThemeSync";
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
  title: "Memory Palace",
  description:
    "Train the method of loci: memorize a shuffled deck of cards by walking a 3D memory palace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ColorThemeSync />
        {children}
      </body>
    </html>
  );
}
