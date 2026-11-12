import type { Metadata } from 'next';
import { AppFooter } from '@/components/AppFooter';
import { PosProvider } from '@/components/PosContext';
import { PosHeader } from '@/components/PosHeader';
import { PosSidebar } from '@/components/PosSidebar';
import { TopBrandBar } from '@/components/TopBrandBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Softifyx - M/S Seastone PVC Pipe Industry | Retail POS',
  description: 'Multi-Branch Retail POS & Inventory Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased lg:h-screen lg:overflow-hidden">
        <PosProvider>
          <div className="shrink-0">
            <TopBrandBar />
            <PosHeader />
          </div>
          <div className="mx-auto flex w-full max-w-[1520px] flex-1 flex-col gap-4 px-4 py-3 sm:px-6 lg:min-h-0 lg:flex-row lg:items-stretch">
            <PosSidebar />
            <main className="min-w-0 flex-1 lg:h-full lg:overflow-y-auto">{children}</main>
          </div>
          <div className="shrink-0">
            <AppFooter />
          </div>
        </PosProvider>
      </body>
    </html>
  );
}
