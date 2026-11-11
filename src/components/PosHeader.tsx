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
  RefreshCw,
  Settings,
  ShoppingCart,
  Store,
  Undo2,
  UserCheck,
} from 'lucide-react';
import { usePosContext } from './PosContext';

const NAV_ITEMS = [
  { href: '/', label: 'Main Dashboard', icon: Home },
  { href: '/sale', label: 'Sale', icon: ShoppingCart },
  { href: '/register', label: 'Sales Register', icon: List },
  { href: '/returns', label: 'Sales Return', icon: Undo2 },
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
    <header className="no-print relative z-30 rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition ${
                isActive
                  ? 'bg-[#69300f] ring-2 ring-amber-400'
                  : 'bg-[#49210a] hover:bg-[#5e2b0d]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              {item.href === '/hold' && heldCount > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[11px] font-bold leading-none text-[#3d1c07]">
                  {heldCount}
                </span>
              )}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#49210a] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5e2b0d]"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {activeUser && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              {activeUser.full_name} ({activeUser.role})
            </span>
          )}
          {activeBranch && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">
              Active Branch: {activeBranch.display_name}
            </span>
          )}
        </div>

        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0fa968] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d945b]"
          >
            <Store className="h-4 w-4" />
            <span>
              {activeBranch ? `Branch: ${activeBranch.name}` : 'Login to Branch'}
            </span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
              <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Branch & Cashier Context
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
                    className="w-full cursor-pointer rounded-lg bg-[#0fa968] py-1.5 text-sm font-semibold text-white hover:bg-[#0d945b]"
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
    </header>
  );
}

