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
  isCustomerModalOpen: boolean;
  setIsCustomerModalOpen: (open: boolean) => void;
  openCustomerModal: () => void;
  closeCustomerModal: () => void;
  selectedCustomerId: number | null;
  setSelectedCustomerId: (id: number | null) => void;
  customerRefreshNonce: number;
  triggerCustomerRefresh: () => void;
  isInventoryModalOpen: boolean;
  setIsInventoryModalOpen: (open: boolean) => void;
  openInventoryModal: () => void;
  closeInventoryModal: () => void;
  inventoryRefreshNonce: number;
  triggerInventoryRefresh: () => void;
  selectedProductIdForPos: number | null;
  setSelectedProductIdForPos: (id: number | null) => void;
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
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerRefreshNonce, setCustomerRefreshNonce] = useState(0);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [selectedProductIdForPos, setSelectedProductIdForPos] = useState<number | null>(null);
  const [inventoryRefreshNonce, setInventoryRefreshNonce] = useState(0);

  const openPosSale = useCallback(() => setIsPosModalOpen(true), []);
  const closePosSale = useCallback(() => setIsPosModalOpen(false), []);
  const openCustomerModal = useCallback(() => setIsCustomerModalOpen(true), []);
  const closeCustomerModal = useCallback(() => setIsCustomerModalOpen(false), []);
  const triggerCustomerRefresh = useCallback(() => setCustomerRefreshNonce((n) => n + 1), []);
  const openInventoryModal = useCallback(() => setIsInventoryModalOpen(true), []);
  const closeInventoryModal = useCallback(() => setIsInventoryModalOpen(false), []);
  const triggerInventoryRefresh = useCallback(() => setInventoryRefreshNonce((n) => n + 1), []);

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
        isCustomerModalOpen,
        setIsCustomerModalOpen,
        openCustomerModal,
        closeCustomerModal,
        selectedCustomerId,
        setSelectedCustomerId,
        customerRefreshNonce,
        triggerCustomerRefresh,
        isInventoryModalOpen,
        setIsInventoryModalOpen,
        openInventoryModal,
        closeInventoryModal,
        inventoryRefreshNonce,
        triggerInventoryRefresh,
        selectedProductIdForPos,
        setSelectedProductIdForPos,
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
