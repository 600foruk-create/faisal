import type { Metadata } from 'next';
import { PosProvider } from '@/components/PosContext';
import { PosHeader } from '@/components/PosHeader';
import { TopBrandBar } from '@/components/TopBrandBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Softifyx - M/S Seastone PVC Pipe Industries | POS & FBR',
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
          <TopBrandBar />
          <div className="mx-auto max-w-[1440px] space-y-5 px-3 py-4 sm:px-6">
            <PosHeader />
            <main>{children}</main>
          </div>
        </PosProvider>
      </body>
    </html>
  );
}
