import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Financial X-Ray | Day 02',
  description: 'Privacy-first personal finance intelligence from CSV and Excel statements. Forecast cash, detect recurring commitments, simulate decisions, and export an action plan.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
