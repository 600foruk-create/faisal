'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Award,
  Boxes,
  Building2,
  Check,
  ChevronDown,
  DatabaseBackup,
  ImagePlus,
  Info,
  KeyRound,
  LogOut,
  Package,
  Percent,
  Phone,
  RefreshCw,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Tag,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { usePosContext } from './PosContext';

type MenuAction =
  | 'backup'
  | 'about_software'
  | 'about_license'
  | 'about_contact'
  | 'open_customers_modal'
  | 'open_inventory_modal';
type AboutSection = 'software' | 'license' | 'contact';

interface DropdownItem {
  label: string;
  href?: string;
  action?: MenuAction;
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
      { label: 'My Company', href: '/settings?tab=business', icon: Building2 },
      { label: 'My Logo', href: '/settings?tab=logo', icon: ImagePlus },
      { label: 'Branches & Counters', href: '/settings?tab=branches', icon: Store },
      { label: 'User Logins', href: '/settings?tab=users', icon: UserCheck },
      { label: 'User Rights', href: '/settings?tab=rights', icon: ShieldCheck },
      { label: 'Passwords', href: '/settings?tab=passwords', icon: KeyRound },
      { label: 'System Settings & Currency', href: '/settings?tab=system', icon: SlidersHorizontal },
      { label: 'Clear Transactions', href: '/settings?tab=clear', icon: Trash2 },
      { label: 'BackUp Utility', action: 'backup', icon: DatabaseBackup },
    ],
  },
  {
    key: 'maintain',
    label: 'Maintain',
    adminOnly: true,
    items: [
      { label: 'Customers', action: 'open_customers_modal', icon: Users },
      { label: 'Chart Of Inventory', action: 'open_inventory_modal', icon: Package },
      { label: 'Inventory Opening Balances', href: '/settings?tab=stock_opening', icon: Boxes },
      { label: 'Item Price Settings', href: '/settings?tab=pricing', icon: Tag },
      { label: 'Item Sales Tax Rates', href: '/settings?tab=tax_rates', icon: Percent },
    ],
  },
  {
    key: 'about',
    label: 'About',
    items: [
      { label: 'Software Information', action: 'about_software', icon: Info },
      { label: 'License Details', action: 'about_license', icon: Award },
      { label: 'Contact Info', action: 'about_contact', icon: Phone },
    ],
  },
];

export function PosHeader() {
  const {
    branches,
    users,
    settings,
    activeBranchId,
    activeUser,
    setActiveBranchId,
    setActiveUser,
    triggerRefresh,
    openCustomerModal,
    openInventoryModal,
  } = usePosContext();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [loginMode, setLoginMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [aboutModal, setAboutModal] = useState<AboutSection | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const barRef = useRef<HTMLDivElement | null>(null);
  const isCashier = activeUser?.role === 'CASHIER';
  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? null;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setBranchMenuOpen(false);
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
    <div
      ref={barRef}
      className="no-print relative z-30 w-full border-b border-slate-800 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#0b1830] text-white shadow-sm"
    >
      <div className="mx-auto flex max-w-[1520px] flex-wrap items-center justify-between gap-2 px-4 py-1.5 sm:px-6">
        {/* LEFT SIDE: Administrator, Maintain, About */}
        <div className="flex flex-wrap items-center gap-1">
          {ADMIN_SUBHEADER_MENUS.map((group) => {
            if (group.adminOnly && isCashier) return null;
            const isOpen = openMenu === group.key;

            return (
              <div key={group.key} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setBranchMenuOpen(false);
                    setOpenMenu(isOpen ? null : group.key);
                  }}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold transition sm:text-[15px] ${
                    group.key === 'administrator'
                      ? isOpen
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'text-amber-400 hover:bg-white/10 hover:text-amber-300'
                      : isOpen
                        ? 'bg-white/15 text-white'
                        : 'text-slate-100 hover:bg-white/10 hover:text-emerald-300'
                  }`}
                >
                  {group.key === 'administrator' && (
                    <Shield
                      className={`h-4 w-4 ${isOpen ? 'text-slate-950' : 'text-amber-400'}`}
                    />
                  )}
                  <span>{group.label}</span>
                  <ChevronDown className="h-4 w-4 opacity-85" />
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
                            className="flex w-full cursor-pointer items-center gap-2.5 border-t border-slate-100 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700"
                          >
                            <Icon className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{item.label}</span>
                          </button>
                        );
                      }
                      if (item.action === 'open_customers_modal') {
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              setOpenMenu(null);
                              openCustomerModal();
                            }}
                            className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700"
                          >
                            <Icon className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{item.label}</span>
                          </button>
                        );
                      }
                      if (item.action === 'open_inventory_modal') {
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              setOpenMenu(null);
                              openInventoryModal();
                            }}
                            className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700"
                          >
                            <Icon className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{item.label}</span>
                          </button>
                        );
                      }
                      if (
                        item.action === 'about_software' ||
                        item.action === 'about_license' ||
                        item.action === 'about_contact'
                      ) {
                        const sectionMap: Record<
                          'about_software' | 'about_license' | 'about_contact',
                          AboutSection
                        > = {
                          about_software: 'software',
                          about_license: 'license',
                          about_contact: 'contact',
                        };
                        const targetSection = sectionMap[item.action];
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              setOpenMenu(null);
                              setAboutModal(targetSection);
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
                          className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 ${
                            item.href === '/settings?tab=clear'
                              ? 'text-rose-700 hover:text-rose-800'
                              : 'text-slate-700 hover:text-emerald-700'
                          }`}
                        >
                          <Icon
                            className={`h-3.5 w-3.5 ${
                              item.href === '/settings?tab=clear'
                                ? 'text-rose-500'
                                : 'text-slate-500'
                            }`}
                          />
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

        {/* RIGHT SIDE: Refresh + Branch Switcher + Welcome User + Switch/Logout Button */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh data"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-white/10 text-sky-200 transition hover:bg-white/20 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenMenu(null);
                setBranchMenuOpen((o) => !o);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-500"
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

          <div className="hidden items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white md:inline-flex">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-950">
              <UserCheck className="h-3 w-3" />
            </span>
            <span className="max-w-[165px] truncate">
              Welcome {activeUser?.full_name ?? 'Administrator'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleQuickSwitchUser}
            title="Switch user session"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-rose-600/90 text-white ring-2 ring-rose-300/70 transition hover:bg-rose-500"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {aboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {aboutModal === 'software' && 'Software Information'}
                  {aboutModal === 'license' && 'License Details'}
                  {aboutModal === 'contact' && 'Contact & Support Info'}
                </h3>
                <p className="text-xs font-semibold text-emerald-700">{settings.business_name}</p>
              </div>
              <div className="flex gap-1">
                {(
                  [
                    { key: 'software', label: 'Software' },
                    { key: 'license', label: 'License' },
                    { key: 'contact', label: 'Contact' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setAboutModal(t.key)}
                    className={`cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold ${
                      aboutModal === t.key
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {aboutModal === 'software' && (
              <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Application:</span>
                  <strong className="text-slate-900">
                    {settings.software_brand || 'Softifyx'} Retail POS
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Edition:</span>
                  <strong className="text-slate-900">Multi-Branch POS v2.5</strong>
                </div>
                <div className="flex justify-between">
                  <span>Currency &amp; Default Tax:</span>
                  <strong className="text-slate-900">
                    {settings.currency_symbol} • {settings.default_tax_rate}%
                  </strong>
                </div>
                <p className="border-t border-slate-200 pt-2 text-[11px] text-slate-500">
                  Includes POS Billing, Returns, Hold/Recall, Multi-Branch Inventory, Day Closing,
                  and Reports.
                </p>
              </div>
            )}

            {aboutModal === 'license' && (
              <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Licensed To:</span>
                  <strong className="text-slate-900">{settings.business_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span>License Status:</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    Active &amp; Verified
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Active Outlets:</span>
                  <strong className="text-slate-900">{branches.length} Branch(es)</strong>
                </div>
                {(settings.ntn || settings.strn) && (
                  <div className="flex justify-between">
                    <span>Tax Registration:</span>
                    <strong className="text-slate-900">
                      {settings.ntn ? `NTN ${settings.ntn}` : ''}{' '}
                      {settings.strn ? `| STRN ${settings.strn}` : ''}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {aboutModal === 'contact' && (
              <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    Software Provider
                  </span>
                  <p className="mt-0.5 font-semibold text-slate-900">
                    {settings.footer_text || 'Softifyx Technologies'}
                  </p>
                </div>
                <div className="border-t border-slate-200 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    Configured Branch Contacts
                  </span>
                  <div className="mt-1 space-y-1">
                    {branches.map((b) => (
                      <div key={b.id} className="rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-slate-200/70">
                        <div className="font-bold text-slate-800">{b.display_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {b.address || 'Main Store'} {b.phone ? `• ${b.phone}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setAboutModal(null)}
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
