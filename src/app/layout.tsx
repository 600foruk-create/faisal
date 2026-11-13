import type { Metadata } from 'next';
import { PosProvider } from '@/components/PosContext';
import { PosLayoutShell } from '@/components/PosLayoutShell';
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
      <body className="antialiased">
        <PosProvider>
          <PosLayoutShell>{children}</PosLayoutShell>
        </PosProvider>
      </body>
    </html>
  );
}
