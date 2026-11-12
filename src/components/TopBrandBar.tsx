'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Building2,
  ChevronDown,
  CloudUpload,
  DatabaseBackup,
  DoorOpen,
  FileText,
  Info,
  LogOut,
  Package,
  PauseCircle,
  Shield,
  ShoppingCart,
  Store,
  Undo2,
  UserCheck,
  Users,
} from 'lucide-react';
import { usePosContext } from './PosContext';

interface MenuItem {
  label: string;
  href?: string;
  action?: 'backup' | 'about';
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

interface MenuGroup {
  key: string;
  label: string;
  adminOnly?: boolean;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    key: 'administrator',
    label: 'Administrator',
    adminOnly: true,
    items: [
      { label: 'Company Name, Logo & Branding', href: '/settings?tab=business', icon: Building2 },
      { label: 'Branches & FBR POSIDs', href: '/settings?tab=branches', icon: Store },
      { label: 'Users, Roles & Passwords', href: '/settings?tab=users', icon: Shield },
      { label: 'Products & Inventory Setup', href: '/settings?tab=products', icon: Package },
      { label: 'Customer Directory', href: '/settings?tab=customers', icon: Users },
      { label: 'Download System Backup (JSON)', action: 'backup', icon: DatabaseBackup },
    ],
  },
  {
    key: 'maintain',
    label: 'Maintain',
    items: [
      { label: 'Products & Pricing', href: '/settings?tab=products', icon: Package, adminOnly: true },
      { label: 'Inventory Balance', href: '/settings?tab=products', icon: Package, adminOnly: true },
      { label: 'Registered Customers', href: '/settings?tab=customers', icon: Users, adminOnly: true },
      { label: 'Branches & Terminals', href: '/settings?tab=branches', icon: Store, adminOnly: true },
    ],
  },
  {
    key: 'sales',
    label: 'Sales & POS',
    items: [
      { label: 'POS Sale (New Bill)', href: '/sale', icon: ShoppingCart },
      { label: 'Sales Register', href: '/register', icon: FileText },
      { label: 'Sales Return / Credit Note', href: '/returns', icon: Undo2 },
      { label: 'Hold / Recall Bills', href: '/hold', icon: PauseCircle },
      { label: 'Day Closing (Z-Report)', href: '/closing', icon: DoorOpen },
    ],
  },
  {
    key: 'fbr',
    label: 'Digital Invoicing',
    items: [
      { label: 'Pending FBR Invoices', href: '/register?fbrStatus=PENDING', icon: CloudUpload },
      { label: 'FBR Sync & Audit Logs', href: '/reports?tab=fbr', icon: FileText },
      { label: 'FBR Terminal Config', href: '/settings?tab=branches', icon: Store, adminOnly: true },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    items: [
      { label: 'Branch Sale Summary', href: '/reports?tab=branches', icon: FileText },
      { label: 'Top Selling Products', href: '/reports?tab=products', icon: Package },
      { label: 'GST / Tax Summary', href: '/reports?tab=tax', icon: FileText },
      { label: 'FBR Digital Invoice Logs', href: '/reports?tab=fbr', icon: CloudUpload },
    ],
  },
  {
    key: 'about',
    label: 'About',
    items: [{ label: 'Software & License Info', action: 'about', icon: Info }],
  },
];

export function TopBrandBar() {
  const { settings, activeUser, users, setActiveUser, setActiveBranchId } = usePosContext();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);

  const isCashier = activeUser?.role === 'CASHIER';

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

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

  const handleQuickLogoutToAdminOrSwitch = () => {
    const firstNonActive = users.find((u) => u.id !== activeUser?.id) ?? users[0];
    if (firstNonActive) {
      setActiveUser(firstNonActive);
      setActiveBranchId(firstNonActive.branch_id ?? null);
    }
  };

  return (
    <div ref={navRef} className="no-print relative z-40 w-full shadow-sm">
      {/* Row 1: Dark Brand Bar */}
      <div className="w-full border-b border-slate-800/80 bg-[#08131f] text-white">
        <div className="mx-auto flex h-12 max-w-[1440px] items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-1.5 text-sm sm:text-base">
            <span className="shrink-0 font-bold tracking-tight text-white">
              {settings.software_brand || 'Softifyx'}
            </span>
            <span className="truncate font-semibold tracking-wide text-amber-400">
              - {settings.business_name || 'M/S SEASTONE PVC PIPE INDUSTRY'}
            </span>
          </div>

          <div
            className="flex h-9 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-0.5 shadow-sm"
            title={settings.business_name}
          >
            {settings.logo_data_url ? (
              <img
                src={settings.logo_data_url}
                alt={settings.business_name}
                className="h-full w-full object-contain"
              />
            ) : (
              <svg viewBox="0 0 64 52" className="h-full w-full" aria-label="Company Logo">
                <path
                  d="M27 7H14C9.5 7 7 9.8 7 13.5C7 17.2 9.5 19.5 14 20.5L22 22.3C26.5 23.3 29 25.8 29 29.5C29 33.5 25.8 36 21 36H8"
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="5.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M35 36V10H46.5C52 10 55.5 13.3 55.5 18.2C55.5 23.1 52 26.4 46.5 26.4H35"
                  fill="none"
                  stroke="#475569"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <text
                  x="32"
                  y="45"
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="800"
                  fill="#334155"
                  fontFamily="Arial, sans-serif"
                >
                  SEASTONE
                </text>
                <text
                  x="32"
                  y="51"
                  textAnchor="middle"
                  fontSize="5.2"
                  fontWeight="700"
                  fill="#ea580c"
                  fontFamily="Arial, sans-serif"
                >
                  PVC PIPES
                </text>
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Espresso Brown ERP Menu Bar with Administrator Dropdown */}
      <div className="w-full border-b border-[#3c1704] bg-[#5c260a] text-white">
        <div className="mx-auto flex min-h-10 max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 py-1 sm:px-6">
          <div className="flex flex-wrap items-center gap-1">
            {MENU_GROUPS.map((group) => {
              if (group.adminOnly && isCashier) return null;
              const visibleItems = group.items.filter((it) => !(it.adminOnly && isCashier));
              if (visibleItems.length === 0) return null;

              const isOpen = openMenu === group.key;
              return (
                <div key={group.key} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenu(isOpen ? null : group.key)}
                    className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                      isOpen
                        ? 'bg-[#7d3510] text-amber-200'
                        : 'text-amber-50/95 hover:bg-[#73300e] hover:text-white'
                    }`}
                  >
                    <span>{group.label}</span>
                    <ChevronDown className="h-3 w-3 opacity-80" />
                  </button>

                  {isOpen && (
                    <div className="absolute left-0 z-50 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white py-1.5 text-slate-800 shadow-2xl">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        if (item.action === 'backup') {
                          return (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => void handleDownloadBackup()}
                              className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-[#5c260a]"
                            >
                              <Icon className="h-3.5 w-3.5 text-amber-600" />
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
                              className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-[#5c260a]"
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
                            className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-[#5c260a]"
                          >
                            <Icon className="h-3.5 w-3.5 text-amber-600" />
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

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-[#7a3511] px-3 py-1 text-xs font-semibold text-amber-100">
              <UserCheck className="h-3.5 w-3.5 text-amber-300" />
              <span>Welcome {activeUser?.full_name ?? 'Administrator'}</span>
            </span>
            <button
              type="button"
              onClick={handleQuickLogoutToAdminOrSwitch}
              title="Switch active user session"
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-rose-400/40 bg-rose-600/90 p-1.5 text-white transition hover:bg-rose-500"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">
              {settings.software_brand} — Retail POS &amp; FBR ERP
            </h3>
            <p className="mt-1 text-xs font-semibold text-amber-700">{settings.business_name}</p>
            <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <p>NTN: {settings.ntn || '-'} | STRN: {settings.strn || '-'}</p>
              <p>Default GST Rate: {settings.default_tax_rate}%</p>
              <p>{settings.footer_text}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAbout(false)}
                className="cursor-pointer rounded-lg bg-[#5c260a] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#73300e]"
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
