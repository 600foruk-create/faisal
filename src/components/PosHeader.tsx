'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BarChart3,
  DoorOpen,
  Home,
  List,
  PauseCircle,
  Plus,
  RefreshCw,
  Settings,
  ShoppingCart,
  Undo2,
} from 'lucide-react';
import { usePosContext } from './PosContext';

const NAV_ITEMS = [
  { href: '/', label: 'Main Dashboard', icon: Home, adminOnly: false },
  { href: '/sale', label: 'POS Sale', icon: ShoppingCart, adminOnly: false },
  { href: '/register', label: 'Sales Register', icon: List, adminOnly: false },
  { href: '/returns', label: 'Sales Return', icon: Undo2, adminOnly: false },
  { href: '/hold', label: 'Hold / Recall', icon: PauseCircle, adminOnly: false },
  { href: '/closing', label: 'Day Closing', icon: DoorOpen, adminOnly: false },
  { href: '/reports', label: 'Reports', icon: BarChart3, adminOnly: false },
  { href: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
];

export function PosHeader() {
  const pathname = usePathname();
  const { activeUser, heldCount, triggerRefresh } = usePosContext();
  const [refreshing, setRefreshing] = useState(false);
  const isCashier = activeUser?.role === 'CASHIER';

  const handleRefresh = () => {
    setRefreshing(true);
    triggerRefresh();
    setTimeout(() => setRefreshing(false), 450);
  };

  return (
    <div className="no-print w-full border-b border-slate-200/90 bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 sm:px-6">
        <nav className="flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.filter((item) => !(item.adminOnly && isCashier)).map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition sm:text-sm ${
                  isActive
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
                {item.href === '/hold' && heldCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-800">
                    {heldCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 py-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/sale"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5 text-emerald-400" />
            <span>New POS Sale</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
