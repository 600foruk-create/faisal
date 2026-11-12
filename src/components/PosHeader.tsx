'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Building2,
  ChevronDown,
  DatabaseBackup,
  Info,
  Package,
  RefreshCw,
  Shield,
  Store,
  Users,
} from 'lucide-react';
import { usePosContext } from './PosContext';

interface DropdownItem {
  label: string;
  href?: string;
  action?: 'backup' | 'about';
  icon: React.ComponentType<{ className?: string }>;
}

interface DropdownGroup {
  key: string;
  label: string;
  adminOnly?: boolean;
  items: DropdownItem[];
}

// Horizontal Admin & Setup menu bar (Daily POS navigation lives in PosSidebar)
const ADMIN_SUBHEADER_MENUS: DropdownGroup[] = [
  {
    key: 'administrator',
    label: 'Administrator',
    adminOnly: true,
    items: [
      { label: 'Company Name, Logo & Branding', href: '/settings?tab=business', icon: Building2 },
      { label: 'Branches & POS Counters', href: '/settings?tab=branches', icon: Store },
      { label: 'Users, Roles & Passwords', href: '/settings?tab=users', icon: Shield },
      { label: 'Download System Backup (JSON)', action: 'backup', icon: DatabaseBackup },
    ],
  },
  {
    key: 'maintain',
    label: 'Maintain',
    adminOnly: true,
    items: [
      { label: 'Products & Pricing', href: '/settings?tab=products', icon: Package },
      { label: 'Registered Customers', href: '/settings?tab=customers', icon: Users },
    ],
  },
  {
    key: 'about',
    label: 'About',
    items: [{ label: 'Software & License Info', action: 'about', icon: Info }],
  },
];

export function PosHeader() {
  const { settings, activeUser, triggerRefresh } = usePosContext();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);

  const isCashier = activeUser?.role === 'CASHIER';

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    triggerRefresh();
    setTimeout(() => setRefreshing(false), 450);
  };

  const handleDownloadBackup = async () => {
    setOpenMenu(null);
    const res = await fetch('/api/settings?backup=1');
    if (!res.ok) return;
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `softifyx-pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div ref={barRef} className="no-print relative z-30 w-full border-b border-slate-200/90 bg-white/95 shadow-2xs backdrop-blur-xs">
      <div className="mx-auto flex max-w-[1520px] flex-wrap items-center justify-between gap-2 px-4 py-1.5 sm:px-6">
        {/* LEFT SIDE: Administrator, Maintain, About */}
        <div className="flex flex-wrap items-center gap-1.5">
          {ADMIN_SUBHEADER_MENUS.map((group) => {
            if (group.adminOnly && isCashier) return null;
            const isOpen = openMenu === group.key;

            return (
              <div key={group.key} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(isOpen ? null : group.key)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    group.key === 'administrator'
                      ? isOpen
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100'
                      : isOpen
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {group.key === 'administrator' && (
                    <Shield className="h-3.5 w-3.5 text-amber-600" />
                  )}
                  <span>{group.label}</span>
                  <ChevronDown className="h-3 w-3 opacity-75" />
                </button>

                {isOpen && (
                  <div className="absolute left-0 z-50 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white py-1.5 text-slate-800 shadow-2xl">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      if (item.action === 'backup') {
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => void handleDownloadBackup()}
                            className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700"
                          >
                            <Icon className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{item.label}</span>
                          </button>
                        );
                      }
                      if (item.action === 'about') {
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              setOpenMenu(null);
                              setShowAbout(true);
                            }}
                            className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-sky-700"
                          >
                            <Icon className="h-3.5 w-3.5 text-sky-600" />
                            <span>{item.label}</span>
                          </button>
                        );
                      }
                      return (
                        <Link
                          key={item.label}
                          href={item.href || '/'}
                          onClick={() => setOpenMenu(null)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700"
                        >
                          <Icon className="h-3.5 w-3.5 text-slate-500" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* RIGHT SIDE: Refresh Action */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">
              {settings.software_brand} — Multi-Branch Retail POS
            </h3>
            <p className="mt-1 text-xs font-semibold text-emerald-700">{settings.business_name}</p>
            <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              {(settings.ntn || settings.strn) && (
                <p>
                  {settings.ntn ? `NTN: ${settings.ntn}` : ''}{' '}
                  {settings.strn ? `| STRN: ${settings.strn}` : ''}
                </p>
              )}
              <p>Default Tax Rate: {settings.default_tax_rate}%</p>
              <p>{settings.footer_text}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAbout(false)}
                className="cursor-pointer rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
