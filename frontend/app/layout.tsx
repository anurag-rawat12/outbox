import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import Providers from '@/app/_components/Providers';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'ONG — ReachInbox Email Scheduler',
  description: 'Schedule and track email campaigns with ReachInbox',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-white text-gray-900 antialiased">
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#ffffff',
                color: '#111827',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
