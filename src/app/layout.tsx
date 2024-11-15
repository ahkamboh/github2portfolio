import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: 'GitHub2Portfolio | Ali Hamza Kamboh',
  description: 'Transform your GitHub profile into a beautiful portfolio website. Showcase your repositories, contributions, and achievements in style.',
  keywords: 'github, portfolio, developer portfolio, github profile, web development, portfolio generator',
  authors: [{ name: 'Ali Hamza Kamboh' }],
  openGraph: {
    title: 'GitHub2Portfolio Generator',
    description: 'Transform your GitHub profile into a beautiful portfolio website',
    type: 'website',
    locale: 'en_US',
    url: 'https://github2portfolio.vercel.app/',
    siteName: 'GitHub2Portfolio Generator',
    images: [
      {
        url: '/og-image.png', // Add your OG image path here
        width: 1200,
        height: 630,
        alt: 'GitHub2Portfolio Generator Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GitHub2Portfolio Generator',
    description: 'Transform your GitHub profile into a beautiful portfolio website',
    images: ['/og-image.png'], // Same as OG image
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
