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
        className={`group flex items-center gap-2 rounded-lg px-2.5 py-1 text-[12.5px] font-semibold transition ${
          collapsed ? 'lg:justify-center lg:px-2' : ''
        } ${
          isActive
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
            : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
        }`}
      >
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${
            isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'
          }`}
        />
        <span className={collapsed ? 'lg:hidden' : 'flex-1 truncate'}>{item.label}</span>
        {item.matchPath === '/hold' && heldCount > 0 && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
              collapsed ? 'lg:hidden' : ''
            } ${isActive ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'}`}
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
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm lg:h-full lg:overflow-y-auto">
        <div>
          {/* Sidebar Header + Collapse Toggle */}
          <div
            className={`mb-1.5 flex items-center ${
              collapsed ? 'justify-center' : 'justify-between px-1.5'
            }`}
          >
            {!collapsed && (
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
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

          <nav aria-label="POS Sidebar Navigation" className="space-y-1.5">
            <div>
              <Link
                href="/"
                title={collapsed ? 'Main Dashboard' : undefined}
                className={`group flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[13px] font-semibold transition ${
                  collapsed ? 'lg:justify-center lg:px-2' : ''
                } ${
                  pathname === '/'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <Home
                  className={`h-4 w-4 shrink-0 ${
                    pathname === '/' ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'
                  }`}
                />
                <span className={collapsed ? 'lg:hidden' : 'flex-1 truncate'}>Main Dashboard</span>
              </Link>
            </div>

            {/* Category 1: Record New */}
            <div>
              {!collapsed ? (
                <div className="mb-1 flex items-center gap-1.5 rounded-lg bg-[#0f1b33] px-2.5 py-1 text-[11px] font-bold text-white">
                  <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Record New</span>
                </div>
              ) : (
                <div className="mx-2 my-1 border-t border-slate-200" />
              )}
              <div className="flex flex-wrap gap-1 lg:flex-col lg:gap-0.5">
                {RECORD_NEW_ITEMS.map(renderSidebarLink)}
              </div>
            </div>

            {/* Category 2: View */}
            <div>
              {!collapsed ? (
                <div className="mb-1 flex items-center gap-1.5 rounded-lg bg-[#0f1b33] px-2.5 py-1 text-[11px] font-bold text-white">
                  <Eye className="h-3.5 w-3.5 text-sky-400" />
                  <span>View</span>
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
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-2.5 py-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
                <Store className="h-3 w-3 text-emerald-600" />
                <span>Active Scope</span>
              </div>
              <div className="mt-0.5 truncate text-xs font-semibold text-slate-800">
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
