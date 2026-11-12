'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  KeyRound,
  LogOut,
  Store,
  UserCheck,
} from 'lucide-react';
import { usePosContext } from './PosContext';

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

  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [loginMode, setLoginMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const barRef = useRef<HTMLDivElement | null>(null);
  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? null;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setBranchMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

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
      className="no-print relative z-40 w-full bg-gradient-to-r from-[#09111e] via-[#0e1930] to-[#132340] text-white shadow-sm"
    >
      <div className="mx-auto flex min-h-13 max-w-[1520px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
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
            <div className="flex items-center gap-1.5 text-sm sm:text-base">
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

        {/* Right: Branch Switcher + Active User + Switch Button */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setBranchMenuOpen((o) => !o)}
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
    </div>
  );
}
