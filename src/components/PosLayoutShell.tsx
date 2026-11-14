'use client';

import React from 'react';
import { AppFooter } from '@/components/AppFooter';
import { PosHeader } from '@/components/PosHeader';
import { PosSidebar } from '@/components/PosSidebar';
import { TopBrandBar } from '@/components/TopBrandBar';
import { usePosContext } from './PosContext';
import { PosSaleModal } from './PosSaleModal';
import { CustomerModal } from './CustomerModal';
import { InventoryModal } from './InventoryModal';

export function PosLayoutShell({ children }: { children: React.ReactNode }) {
  const { isPosModalOpen, isCustomerModalOpen, isInventoryModalOpen } = usePosContext();

  return (
    <div className="flex min-h-screen flex-col bg-[#F3F5F8] text-slate-900 antialiased lg:h-screen lg:overflow-hidden">
      {/* Top Brand Bar & Navigation Subheader */}
      <div className="shrink-0">
        <TopBrandBar />
        <PosHeader />
      </div>

      {/* Main Workspace with Sidebar & Content */}
      <div className="mx-auto flex w-full max-w-[1640px] flex-1 flex-col gap-3.5 px-3 py-2.5 sm:px-5 lg:min-h-0 lg:flex-row lg:items-stretch">
        <PosSidebar />
        <main className="min-w-0 flex-1 lg:h-full lg:overflow-y-auto">{children}</main>
      </div>

      {/* App Footer */}
      <div className="shrink-0">
        <AppFooter />
      </div>

      {/* FLOATING POS SALE FORM WINDOW (Executive Desktop ERP Dialog over Dashboard) */}
      {isPosModalOpen && <PosSaleModal />}

      {/* FLOATING CUSTOMER DIRECTORY MODAL (Maintain Module) */}
      {isCustomerModalOpen && <CustomerModal />}

      {/* FLOATING CHART OF INVENTORY MODAL (Maintain Module) */}
      {isInventoryModalOpen && <InventoryModal />}
    </div>
  );
}
