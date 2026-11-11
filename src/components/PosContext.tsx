'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Branch, BusinessSettings, PosTerminal, UserSummary } from '@/lib/types';

interface PosContextValue {
  branches: Branch[];
  terminals: PosTerminal[];
  users: UserSummary[];
  settings: BusinessSettings;
  activeBranchId: number | null;
  activeUser: UserSummary | null;
  heldCount: number;
  loading: boolean;
  refreshNonce: number;
  setActiveBranchId: (branchId: number | null) => void;
  setActiveUser: (user: UserSummary | null) => void;
  triggerRefresh: () => void;
  reloadContext: () => Promise<void>;
  refreshHeldCount: () => Promise<void>;
}

const DEFAULT_SETTINGS: BusinessSettings = {
  business_name: 'SEASTONE RETAIL OUTLET',
  ntn: '',
  strn: '',
  default_tax_rate: 18,
  receipt_footer: '',
  currency_symbol: 'Rs.',
};

const PosContext = createContext<PosContextValue | null>(null);

export function PosProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [terminals, setTerminals] = useState<PosTerminal[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [activeBranchId, setActiveBranchIdState] = useState<number | null>(null);
  const [activeUser, setActiveUserState] = useState<UserSummary | null>(null);
  const [heldCount, setHeldCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Hostinger First-Run Setup state
  const [needsSetup, setNeedsSetup] = useState(false);
  const [dbHost, setDbHost] = useState('127.0.0.1');
  const [dbName, setDbName] = useState('u2456697138_faisal');
  const [dbUser, setDbUser] = useState('u2456697138_faisal');
  const [dbPass, setDbPass] = useState('');
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [manualConfigPhp, setManualConfigPhp] = useState('');

  const refreshHeldCount = useCallback(async () => {
    try {
      const res = await fetch('/api/hold');
      if (res.ok) {
        const data = (await res.json()) as { carts?: unknown[] };
        setHeldCount(data.carts?.length ?? 0);
      }
    } catch {
      // ignore transient network errors
    }
  }, []);

  const reloadContext = useCallback(async () => {
    try {
      const res = await fetch('/api/context');
      const data = (await res.json().catch(() => ({}))) as {
        needsSetup?: boolean;
        defaults?: { host?: string; database?: string; username?: string };
        branches?: Branch[];
        terminals?: PosTerminal[];
        users?: UserSummary[];
        settings?: BusinessSettings;
      };

      if (data.needsSetup) {
        setNeedsSetup(true);
        if (data.defaults?.host) setDbHost(data.defaults.host);
        if (data.defaults?.database) setDbName(data.defaults.database);
        if (data.defaults?.username) setDbUser(data.defaults.username);
        return;
      }

      if (!res.ok || !data.branches) return;

      setNeedsSetup(false);
      setBranches(data.branches);
      setTerminals(data.terminals ?? []);
      setUsers(data.users ?? []);
      if (data.settings) setSettings(data.settings);

      setActiveUserState((prev) => {
        if (prev) return prev;
        const savedUserId =
          typeof window !== 'undefined' ? window.localStorage.getItem('pos_user_id') : null;
        if (savedUserId && data.users) {
          const found = data.users.find((u) => u.id === Number(savedUserId));
          if (found) return found;
        }
        return data.users?.[0] ?? null;
      });

      setActiveBranchIdState((prev) => {
        if (prev !== null) return prev;
        const savedBranch =
          typeof window !== 'undefined' ? window.localStorage.getItem('pos_branch_id') : null;
        if (savedBranch && savedBranch !== 'ALL' && data.branches) {
          const id = Number(savedBranch);
          if (data.branches.some((b) => b.id === id)) return id;
        }
        return null;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadContext();
    void refreshHeldCount();
  }, [reloadContext, refreshHeldCount]);

  const setActiveBranchId = useCallback((branchId: number | null) => {
    setActiveBranchIdState(branchId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pos_branch_id', branchId ? String(branchId) : 'ALL');
    }
  }, []);

  const setActiveUser = useCallback((user: UserSummary | null) => {
    setActiveUserState(user);
    if (typeof window !== 'undefined') {
      if (user) {
        window.localStorage.setItem('pos_user_id', String(user.id));
      } else {
        window.localStorage.removeItem('pos_user_id');
      }
    }
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
    void reloadContext();
    void refreshHeldCount();
  }, [reloadContext, refreshHeldCount]);

  const handleRunSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupBusy(true);
    setSetupError('');
    setManualConfigPhp('');
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: dbHost,
          database: dbName,
          username: dbUser,
          password: dbPass,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        manualConfig?: string;
      };
      if (!res.ok || !data.ok) {
        setSetupError(data.error || 'Database connection failed.');
        if (data.manualConfig) setManualConfigPhp(data.manualConfig);
        return;
      }
      setNeedsSetup(false);
      setDbPass('');
      await reloadContext();
      await refreshHeldCount();
      setRefreshNonce((n) => n + 1);
    } catch {
      setSetupError('Unable to reach /api/setup. Check Apache .htaccess or PHP configuration.');
    } finally {
      setSetupBusy(false);
    }
  };

  return (
    <PosContext.Provider
      value={{
        branches,
        terminals,
        users,
        settings,
        activeBranchId,
        activeUser,
        heldCount,
        loading,
        refreshNonce,
        setActiveBranchId,
        setActiveUser,
        triggerRefresh,
        reloadContext,
        refreshHeldCount,
      }}
    >
      {children}

      {needsSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              Hostinger MySQL First-Time Setup
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Enter your Hostinger MySQL password once to initialize all POS & FBR tables and seed
              demo branches on this server.
            </p>

            <form onSubmit={handleRunSetup} className="mt-4 space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  MySQL Host
                </label>
                <input
                  type="text"
                  value={dbHost}
                  onChange={(e) => setDbHost(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Database Name
                </label>
                <input
                  type="text"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Database Username
                </label>
                <input
                  type="text"
                  value={dbUser}
                  onChange={(e) => setDbUser(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Database Password
                </label>
                <input
                  type="password"
                  value={dbPass}
                  onChange={(e) => setDbPass(e.target.value)}
                  placeholder="Enter MySQL password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>

              {setupError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {setupError}
                </div>
              )}

              {manualConfigPhp && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
                  <p className="font-semibold">Create api/config.local.php with:</p>
                  <pre className="mt-1 overflow-x-auto font-mono">{manualConfigPhp}</pre>
                </div>
              )}

              <button
                type="submit"
                disabled={setupBusy}
                className="w-full cursor-pointer rounded-lg bg-[#0fa968] py-2.5 text-sm font-bold text-white hover:bg-[#0d945b] disabled:opacity-50"
              >
                {setupBusy ? 'Connecting & Installing Tables...' : 'Connect & Initialize Database'}
              </button>
            </form>
          </div>
        </div>
      )}
    </PosContext.Provider>
  );
}

export function usePosContext() {
  const ctx = useContext(PosContext);
  if (!ctx) {
    throw new Error('usePosContext must be used inside PosProvider');
  }
  return ctx;
}
