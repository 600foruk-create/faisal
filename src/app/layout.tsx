import type { Metadata } from 'next';
import { AppFooter } from '@/components/AppFooter';
import { PosProvider } from '@/components/PosContext';
import { PosHeader } from '@/components/PosHeader';
import { TopBrandBar } from '@/components/TopBrandBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Softifyx - M/S Seastone PVC Pipe Industry | POS & FBR',
  description: 'Multi-Branch Retail POS & Pakistan FBR POS Integration System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <PosProvider>
          <TopBrandBar />
          <PosHeader />
          <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6">
            <main>{children}</main>
          </div>
          <AppFooter />
        </PosProvider>
      </body>
    </html>
  );
}
