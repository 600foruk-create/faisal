'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  BarChart3,
  Boxes,
  DoorOpen,
  Eye,
  Home,
  List,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  PauseCircle,
  PlusCircle,
  ReceiptText,
  ShoppingCart,
  Store,
  Undo2,
} from 'lucide-react';
import { usePosContext } from './PosContext';

interface SidebarItem {
  href: string;
  matchPath: string;
  matchTab?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const RECORD_NEW_ITEMS: SidebarItem[] = [
  { href: '/sale', matchPath: '/sale', label: 'POS Sale (New Bill)', icon: ShoppingCart },
  { href: '/returns', matchPath: '/returns', label: 'Sales Return', icon: Undo2 },
  { href: '/hold', matchPath: '/hold', label: 'Hold / Recall Bill', icon: PauseCircle },
  { href: '/closing', matchPath: '/closing', label: 'Day Closing', icon: DoorOpen },
];

const VIEW_ITEMS: SidebarItem[] = [
  { href: '/register', matchPath: '/register', label: 'Sales Register', icon: List },
  {
    href: '/reports?tab=branches',
    matchPath: '/reports',
    matchTab: 'branches',
    label: 'Sale Summary',
    icon: BarChart3,
  },
  {
    href: '/reports?tab=products',
    matchPath: '/reports',
    matchTab: 'products',
    label: 'Top Products',
    icon: Package,
  },
  {
    href: '/reports?tab=tax',
    matchPath: '/reports',
    matchTab: 'tax',
    label: 'GST / Tax Summary',
    icon: ReceiptText,
  },
  {
    href: '/reports?tab=inventory',
    matchPath: '/reports',
    matchTab: 'inventory',
    label: 'Inventory Balance',
    icon: Boxes,
  },
];

function PosSidebarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeReportTab = searchParams.get('tab') || 'branches';

  const { branches, activeBranchId, heldCount } = usePosContext();
  const [collapsed, setCollapsed] = useState(false);

  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? null;

  const isItemActive = (item: SidebarItem) => {
    if (item.matchPath === '/reports') {
      return pathname.startsWith('/reports') && activeReportTab === (item.matchTab ?? 'branches');
    }
    return pathname === item.matchPath || pathname.startsWith(`${item.matchPath}/`);
  };

  const renderSidebarLink = (item: SidebarItem) => {
    const Icon = item.icon;
    const isActive = isItemActive(item);
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={`group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition ${
          collapsed ? 'lg:justify-center lg:px-2' : ''
        } ${
          isActive
            ? 'border border-amber-500/40 bg-gradient-to-r from-[#501F07] to-[#65280B] text-white shadow-xs'
            : 'text-slate-700 hover:bg-amber-50/60 hover:text-amber-900'
        }`}
      >
        <Icon
          className={`h-3.5 w-3.5 shrink-0 transition ${
            isActive ? 'text-amber-300' : 'text-slate-400 group-hover:text-amber-700'
          }`}
        />
        <span className={collapsed ? 'lg:hidden' : 'flex-1 truncate'}>{item.label}</span>
        {item.matchPath === '/hold' && heldCount > 0 && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
              collapsed ? 'lg:hidden' : ''
            } ${isActive ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-900'}`}
          >
            {heldCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={`no-print w-full shrink-0 transition-all duration-200 ${
        collapsed ? 'lg:w-[70px]' : 'lg:w-[244px]'
      } lg:h-full`}
    >
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-sm lg:h-full lg:overflow-y-auto">
        <div>
          {/* Sidebar Header + Collapse Toggle */}
          <div
            className={`mb-2 flex items-center ${
              collapsed ? 'justify-center' : 'justify-between px-1.5'
            }`}
          >
            {!collapsed && (
              <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                POS Menu
              </span>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden cursor-pointer rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:inline-flex"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          <nav aria-label="POS Sidebar Navigation" className="space-y-2">
            <div>
              <Link
                href="/"
                title={collapsed ? 'Main Dashboard' : undefined}
                className={`group flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-bold transition ${
                  collapsed ? 'lg:justify-center lg:px-2' : ''
                } ${
                  pathname === '/'
                    ? 'border border-amber-500/40 bg-gradient-to-r from-[#501F07] to-[#65280B] text-white shadow-sm'
                    : 'text-slate-700 hover:bg-amber-50/60 hover:text-amber-900'
                }`}
              >
                <Home
                  className={`h-4 w-4 shrink-0 transition ${
                    pathname === '/' ? 'text-amber-300' : 'text-slate-400 group-hover:text-amber-700'
                  }`}
                />
                <span className={collapsed ? 'lg:hidden' : 'flex-1 truncate'}>Main Dashboard</span>
              </Link>
            </div>

            {/* Category 1: Record New (Softifyx Dark Espresso Brand Badge) */}
            <div>
              {!collapsed ? (
                <div className="mb-1.5 flex items-center gap-1.5 rounded-lg border border-amber-950/60 bg-gradient-to-r from-[#240E05] via-[#351507] to-[#240E05] px-2.5 py-1 text-[11px] font-black text-amber-200 shadow-2xs">
                  <PlusCircle className="h-3.5 w-3.5 text-amber-400" />
                  <span className="tracking-wide">Record New</span>
                </div>
              ) : (
                <div className="mx-2 my-1 border-t border-slate-200" />
              )}
              <div className="flex flex-wrap gap-1 lg:flex-col lg:gap-0.5">
                {RECORD_NEW_ITEMS.map(renderSidebarLink)}
              </div>
            </div>

            {/* Category 2: View (Softifyx Dark Espresso Brand Badge) */}
            <div>
              {!collapsed ? (
                <div className="mb-1.5 flex items-center gap-1.5 rounded-lg border border-amber-950/60 bg-gradient-to-r from-[#240E05] via-[#351507] to-[#240E05] px-2.5 py-1 text-[11px] font-black text-amber-200 shadow-2xs">
                  <Eye className="h-3.5 w-3.5 text-amber-400" />
                  <span className="tracking-wide">View</span>
                </div>
              ) : (
                <div className="mx-2 my-1 border-t border-slate-200" />
              )}
              <div className="flex flex-wrap gap-1 lg:flex-col lg:gap-0.5">
                {VIEW_ITEMS.map(renderSidebarLink)}
              </div>
            </div>
          </nav>
        </div>

        {/* Active Branch Scope */}
        {!collapsed && (
          <div className="mt-2 hidden border-t border-slate-100 pt-2 lg:block">
            <div className="rounded-xl border border-amber-300/60 bg-amber-50/50 px-2.5 py-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider text-amber-900 uppercase">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span>Active Scope</span>
              </div>
              <div className="mt-0.5 truncate text-xs font-bold text-slate-900">
                {activeBranch ? activeBranch.name : 'All Branches (Consolidated)'}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export function PosSidebar() {
  return (
    <Suspense
      fallback={
        <aside className="no-print hidden w-[244px] shrink-0 rounded-2xl border border-slate-200 bg-white p-3 lg:block" />
      }
    >
      <PosSidebarInner />
    </Suspense>
  );
}
