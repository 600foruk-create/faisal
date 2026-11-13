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
  isPosModalOpen: boolean;
  setIsPosModalOpen: (open: boolean) => void;
  openPosSale: () => void;
  closePosSale: () => void;
  setActiveBranchId: (branchId: number | null) => void;
  setActiveUser: (user: UserSummary | null) => void;
  triggerRefresh: () => void;
  reloadContext: () => Promise<void>;
  refreshHeldCount: () => Promise<void>;
}

const DEFAULT_SETTINGS: BusinessSettings = {
  software_brand: 'Softifyx',
  business_name: 'M/S SEASTONE PVC PIPE INDUSTRY',
  logo_data_url: '',
  footer_text: 'Designed & Developed by Softifyx Technologies',
  ntn: '',
  strn: '',
  default_tax_rate: 18,
  default_opening_cash: 5000,
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
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);

  const openPosSale = useCallback(() => setIsPosModalOpen(true), []);
  const closePosSale = useCallback(() => setIsPosModalOpen(false), []);

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
      if (!res.ok) return;
      const data = (await res.json()) as {
        branches?: Branch[];
        terminals?: PosTerminal[];
        users?: UserSummary[];
        settings?: BusinessSettings;
      };
      if (!data.branches) return;

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
        isPosModalOpen,
        setIsPosModalOpen,
        openPosSale,
        closePosSale,
        setActiveBranchId,
        setActiveUser,
        triggerRefresh,
        reloadContext,
        refreshHeldCount,
      }}
    >
      {children}
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
