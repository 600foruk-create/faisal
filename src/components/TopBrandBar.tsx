'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Check,
  ChevronDown,
  CloudUpload,
  DatabaseBackup,
  DoorOpen,
  FileText,
  Info,
  KeyRound,
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
    adminOnly: true,
    items: [
      { label: 'Products & Pricing', href: '/settings?tab=products', icon: Package },
      { label: 'Inventory Balance', href: '/settings?tab=products', icon: Package },
      { label: 'Registered Customers', href: '/settings?tab=customers', icon: Users },
      { label: 'Branches & Terminals', href: '/settings?tab=branches', icon: Store },
    ],
  },
  {
    key: 'sales',
    label: 'POS & Sales',
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
    label: 'FBR Digital',
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
  const {
    branches,
    users,
    settings,
    activeBranchId,
    activeUser,
    setActiveBranchId,
    setActiveUser,
  } = usePosContext();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [loginMode, setLoginMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showAbout, setShowAbout] = useState(false);

  const navRef = useRef<HTMLDivElement | null>(null);
  const isCashier = activeUser?.role === 'CASHIER';
  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? null;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setBranchMenuOpen(false);
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

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { user?: typeof activeUser; error?: string };
      if (!res.ok || !data.user) {
        setLoginError(data.error || 'Invalid credentials');
        return;
      }
      setActiveUser(data.user);
      setActiveBranchId(data.user.branch_id ?? null);
      setLoginMode(false);
      setUsername('');
      setPassword('');
      setBranchMenuOpen(false);
    } catch {
      setLoginError('Failed to verify login');
    }
  };

  const handleQuickSwitchUser = () => {
    const nextUser = users.find((u) => u.id !== activeUser?.id && u.is_active === 1) ?? users[0];
    if (nextUser) {
      setActiveUser(nextUser);
      setActiveBranchId(nextUser.branch_id ?? null);
    }
  };

  return (
    <div ref={navRef} className="no-print relative z-40 w-full bg-[#0b1324] text-white shadow-sm">
      <div className="mx-auto flex min-h-14 max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
        {/* Left: Logo + Software Brand + Company Name */}
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-9 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-0.5 shadow-xs"
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
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-extrabold tracking-tight text-white">
                {settings.software_brand || 'Softifyx'}
              </span>
              <span className="hidden truncate font-semibold text-amber-400 sm:inline">
                — {settings.business_name || 'M/S SEASTONE PVC PIPE INDUSTRY'}
              </span>
            </div>
            <p className="truncate text-[11px] font-medium text-slate-400 sm:hidden">
              {settings.business_name}
            </p>
          </div>
        </Link>

        {/* Center: Clean ERP Dropdowns (Administrator, Maintain, POS & Sales, FBR Digital, Reports, About) */}
        <nav className="flex flex-wrap items-center gap-0.5">
          {MENU_GROUPS.map((group) => {
            if (group.adminOnly && isCashier) return null;
            const visibleItems = group.items.filter((it) => !(it.adminOnly && isCashier));
            if (visibleItems.length === 0) return null;

            const isOpen = openMenu === group.key;
            return (
              <div key={group.key} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setBranchMenuOpen(false);
                    setOpenMenu(isOpen ? null : group.key);
                  }}
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                    group.key === 'administrator'
                      ? isOpen
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-white/10 text-amber-300 hover:bg-white/15 hover:text-amber-200'
                      : isOpen
                        ? 'bg-white/15 text-white'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {group.key === 'administrator' && <Shield className="h-3.5 w-3.5" />}
                  <span>{group.label}</span>
                  <ChevronDown className="h-3 w-3 opacity-75" />
                </button>

                {isOpen && (
                  <div className="absolute left-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white py-1.5 text-slate-800 shadow-2xl">
                    {visibleItems.map((item) => {
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
        </nav>

        {/* Right: Branch Context Switcher + User Pill */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenMenu(null);
                setBranchMenuOpen((o) => !o);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-500"
            >
              <Store className="h-3.5 w-3.5" />
              <span>{activeBranch ? activeBranch.name : 'All Branches'}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-85" />
            </button>

            {branchMenuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3.5 text-slate-800 shadow-2xl">
                <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Branch &amp; Cashier Session
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode((v) => !v);
                      setLoginError('');
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    <KeyRound className="h-3 w-3" />
                    {loginMode ? 'Quick Switch' : 'Sign In w/ Password'}
                  </button>
                </div>

                {loginMode ? (
                  <form onSubmit={handleCredentialLogin} className="space-y-2.5">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username (e.g. admin)"
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                      required
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password / PIN"
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                      required
                    />
                    {loginError && <p className="text-xs font-medium text-red-600">{loginError}</p>}
                    <button
                      type="submit"
                      className="w-full cursor-pointer rounded-lg bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      Sign In
                    </button>
                    <p className="text-[11px] text-slate-400">
                      Demo: admin / admin123, cashier.timergara / 1234
                    </p>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Branch View
                      </p>
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBranchId(null);
                            setBranchMenuOpen(false);
                          }}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium ${
                            activeBranchId === null
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>All Branches (Consolidated)</span>
                          {activeBranchId === null && <Check className="h-3.5 w-3.5" />}
                        </button>
                        {branches.map((branch) => (
                          <button
                            key={branch.id}
                            type="button"
                            onClick={() => {
                              setActiveBranchId(branch.id);
                              setBranchMenuOpen(false);
                            }}
                            className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium ${
                              activeBranchId === branch.id
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{branch.display_name}</span>
                            {activeBranchId === branch.id && <Check className="h-3.5 w-3.5" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-2">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Switch User
                      </p>
                      <div className="space-y-1">
                        {users
                          .filter((u) => u.is_active === 1)
                          .map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setActiveUser(u);
                                setActiveBranchId(u.branch_id ?? null);
                                setBranchMenuOpen(false);
                              }}
                              className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs ${
                                activeUser?.id === u.id
                                  ? 'bg-amber-50 font-semibold text-amber-900'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>
                                {u.full_name}{' '}
                                <span className="text-[11px] text-slate-400">({u.role})</span>
                              </span>
                              {activeUser?.id === u.id && <Check className="h-3.5 w-3.5" />}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="hidden items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-100 md:inline-flex">
            <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>{activeUser?.full_name ?? 'Administrator'}</span>
          </div>

          <button
            type="button"
            onClick={handleQuickSwitchUser}
            title="Switch user session"
            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/10 p-1.5 text-slate-300 transition hover:bg-rose-600 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">
              {settings.software_brand} — Retail POS &amp; FBR ERP
            </h3>
            <p className="mt-1 text-xs font-semibold text-emerald-700">{settings.business_name}</p>
            <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <p>NTN: {settings.ntn || '-'} | STRN: {settings.strn || '-'}</p>
              <p>Default GST Rate: {settings.default_tax_rate}%</p>
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
