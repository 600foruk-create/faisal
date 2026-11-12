'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BarChart3,
  Check,
  ChevronDown,
  DoorOpen,
  Home,
  KeyRound,
  List,
  PauseCircle,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Undo2,
  UserCheck,
} from 'lucide-react';
import { usePosContext } from './PosContext';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/sale', label: 'POS Sale', icon: ShoppingCart },
  { href: '/register', label: 'Sales Register', icon: List },
  { href: '/returns', label: 'Returns', icon: Undo2 },
  { href: '/hold', label: 'Hold / Recall', icon: PauseCircle },
  { href: '/closing', label: 'Day Closing', icon: DoorOpen },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function PosHeader() {
  const pathname = usePathname();
  const {
    branches,
    users,
    settings,
    activeBranchId,
    activeUser,
    heldCount,
    setActiveBranchId,
    setActiveUser,
    triggerRefresh,
  } = usePosContext();

  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loginMode, setLoginMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? null;

  const handleRefresh = () => {
    setRefreshing(true);
    triggerRefresh();
    setTimeout(() => setRefreshing(false), 450);
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
      setMenuOpen(false);
    } catch {
      setLoginError('Failed to verify login');
    }
  };

  return (
    <header className="no-print relative z-30 overflow-visible rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm">
      {/* Top Executive Brand & Session Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-amber-400 shadow-sm">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-tight text-slate-900 sm:text-base">
                {settings.business_name}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <ShieldCheck className="h-3 w-3" />
                FBR POS Ready
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500">
              Multi-Branch Retail Management &amp; Digital Fiscal Invoicing
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeUser && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-semibold text-slate-900">{activeUser.full_name}</span>
              <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                {activeUser.role}
              </span>
            </span>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh live data"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 sm:text-sm"
            >
              <Store className="h-4 w-4" />
              <span>
                {activeBranch ? activeBranch.name : 'All Branches'}
              </span>
              <ChevronDown className="h-4 w-4 opacity-80" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xl">
                <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Branch &amp; Cashier Context
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
                    {loginMode ? 'Quick Switch' : 'Login w/ Password'}
                  </button>
                </div>

                {loginMode ? (
                  <form onSubmit={handleCredentialLogin} className="space-y-2.5">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Username
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="admin or cashier.timergara"
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Password / PIN
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="admin123 or 1234"
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
                        required
                      />
                    </div>
                    {loginError && (
                      <p className="text-xs font-medium text-red-600">{loginError}</p>
                    )}
                    <button
                      type="submit"
                      className="w-full cursor-pointer rounded-lg bg-emerald-600 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Sign In to Branch
                    </button>
                    <p className="text-[11px] text-slate-400">
                      Demo: admin / admin123, cashier.timergara / 1234
                    </p>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-slate-500">
                        Select Active Branch
                      </p>
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBranchId(null);
                            setMenuOpen(false);
                          }}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition ${
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
                              setMenuOpen(false);
                            }}
                            className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition ${
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
                      <p className="mb-1.5 text-xs font-semibold text-slate-500">
                        Quick Cashier / User Switch
                      </p>
                      <div className="space-y-1">
                        {users.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setActiveUser(u);
                              setActiveBranchId(u.branch_id ?? null);
                              setMenuOpen(false);
                            }}
                            className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
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
        </div>
      </div>

      {/* Modern Executive Navigation Rail */}
      <nav className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900 p-1.5">
        <div className="flex flex-wrap items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
                {item.href === '/hold' && heldCount > 0 && (
                  <span
                    className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                      isActive
                        ? 'bg-amber-500 text-white'
                        : 'bg-amber-400 text-slate-950'
                    }`}
                  >
                    {heldCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <Link
          href="/sale"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>New Bill</span>
        </Link>
      </nav>
    </header>
  );
}
