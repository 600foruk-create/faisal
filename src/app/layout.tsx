import type { Metadata } from 'next';
import { PosProvider } from '@/components/PosContext';
import { PosHeader } from '@/components/PosHeader';
import './globals.css';

export const metadata: Metadata = {
  title: 'Seastone Retail POS & FBR Digital Invoicing',
  description: 'Multi-Branch Retail POS & Pakistan FBR POS Integration System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <PosProvider>
          <div className="mx-auto max-w-[1400px] space-y-4 px-3 py-4 sm:px-5">
            <PosHeader />
            <main>{children}</main>
          </div>
        </PosProvider>
      </body>
    </html>
  );
}

