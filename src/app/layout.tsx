import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://supremebarbershop.ca'),
  title: {
    default: 'Supreme Barbershop — Edmonton',
    template: '%s · Supreme Barbershop',
  },
  description:
    'Precision cuts, beard work and straight-razor finishes at 7906A 104 Street NW, Edmonton. Open seven days. Book a chair in sixty seconds.',
  openGraph: {
    title: 'Supreme Barbershop — Edmonton',
    description: 'Precision, chair by chair. 7906A 104 Street NW, Edmonton. Open seven days.',
    type: 'website',
    locale: 'en_CA',
  },
};

export const viewport: Viewport = {
  themeColor: '#08090b',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <body className="min-h-svh bg-obsidian text-porcelain antialiased">{children}</body>
    </html>
  );
}
