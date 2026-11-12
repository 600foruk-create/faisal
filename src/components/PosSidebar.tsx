'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BarChart3,
  DoorOpen,
  Home,
  List,
  PanelLeftClose,
  PanelLeftOpen,
  PauseCircle,
  ShoppingCart,
  Store,
  Undo2,
} from 'lucide-react';
import { usePosContext } from './PosContext';

const SIDEBAR_ITEMS = [
  { href: '/', label: 'Main Dashboard', icon: Home },
  { href: '/sale', label: 'POS Sale', icon: ShoppingCart },
  { href: '/register', label: 'Sales Register', icon: List },
  { href: '/returns', label: 'Sales Return', icon: Undo2 },
  { href: '/hold', label: 'Hold / Recall', icon: PauseCircle },
  { href: '/closing', label: 'Day Closing', icon: DoorOpen },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

export function PosSidebar() {
  const pathname = usePathname();
  const { branches, activeBranchId, heldCount } = usePosContext();
  const [collapsed, setCollapsed] = useState(false);

  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? null;

  return (
    <aside
      className={`no-print w-full shrink-0 transition-all duration-200 ${
        collapsed ? 'lg:w-[70px]' : 'lg:w-[216px]'
      } lg:sticky lg:top-4`}
    >
      <div className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        {/* Sidebar Header */}
        <div
          className={`mb-2 flex items-center ${
            collapsed ? 'justify-center' : 'justify-between px-2'
          } pt-0.5`}
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
            className="hidden cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:inline-flex"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <nav
          aria-label="POS Sidebar Navigation"
          className="flex flex-wrap gap-1 lg:flex-col lg:gap-1"
        >
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${
                  collapsed ? 'lg:justify-center lg:px-2' : ''
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'
                  }`}
                />
                <span className={collapsed ? 'lg:hidden' : 'flex-1 truncate'}>{item.label}</span>
                {item.href === '/hold' && heldCount > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                      collapsed ? 'lg:hidden' : ''
                    } ${
                      isActive ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {heldCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Active Branch Scope */}
        {!collapsed && (
          <div className="mt-3 hidden border-t border-slate-100 pt-3 lg:block">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
                <Store className="h-3 w-3 text-emerald-600" />
                <span>Active Scope</span>
              </div>
              <div className="mt-1 truncate text-xs font-semibold text-slate-800">
                {activeBranch ? activeBranch.name : 'All Branches (Consolidated)'}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
