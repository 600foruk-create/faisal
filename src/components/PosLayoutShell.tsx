'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AppFooter } from '@/components/AppFooter';
import { PosHeader } from '@/components/PosHeader';
import { PosSidebar } from '@/components/PosSidebar';
import { TopBrandBar } from '@/components/TopBrandBar';

export function PosLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDedicatedPos = pathname === '/sale';

  if (isDedicatedPos) {
    return (
      <div className="flex min-h-screen flex-col bg-[#EFECE6] text-slate-900 antialiased">
        {/* Softifyx ERP Top Brand Banner */}
        <TopBrandBar />

        {/* Dedicated Full-Width POS Workstation (No Sidebar Cramping Columns) */}
        <main className="flex-1 overflow-x-hidden p-2 sm:p-3 lg:p-4">
          <div className="mx-auto w-full max-w-[1660px]">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col antialiased lg:h-screen lg:overflow-hidden">
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
    </div>
  );
}

