'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Terminal,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import type { Branch, UserRole, UserSummary } from '@/lib/types';

type UserTab = 'directory' | 'hierarchy' | 'session';

export function UserLoginsModal() {
  const {
    users,
    branches,
    settings,
    activeUser,
    setActiveUser,
    setActiveBranchId,
    closeUserLoginsModal,
    reloadContext,
    refreshNonce,
  } = usePosContext();

  // Window Controls
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<UserTab>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Toast State
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Drawer / Form State for Add / Edit User
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | undefined>(undefined);
  const [uUsername, setUUsername] = useState('');
  const [uFullName, setUFullName] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRole, setURole] = useState<UserRole>('CASHIER');
  const [uBranchId, setUBranchId] = useState<string>('');
  const [uActive, setUActive] = useState<number>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check if current user is Platform Super Admin
  const isSuperAdmin = useMemo(() => {
    if (!activeUser) return true;
    return (
      activeUser.role === 'SUPER_ADMIN' ||
      activeUser.username.toLowerCase() === 'admin'
    );
  }, [activeUser]);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDrawer) {
          setShowDrawer(false);
        } else {
          closeUserLoginsModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeUserLoginsModal, showDrawer]);

  // Filtered users by search query and dropdown filters
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (branchFilter !== 'ALL') {
        if (branchFilter === 'NONE' && u.branch_id !== null) return false;
        if (branchFilter !== 'NONE' && String(u.branch_id) !== branchFilter) return false;
      }
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ACTIVE' && u.is_active !== 1) return false;
        if (statusFilter === 'DISABLED' && u.is_active === 1) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        u.username.toLowerCase().includes(q) ||
        u.full_name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.branch_name && u.branch_name.toLowerCase().includes(q))
      );
    });
  }, [users, searchQuery, roleFilter, branchFilter, statusFilter]);

  // KPI Metrics
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;
  const cashierCount = users.filter((u) => u.role === 'CASHIER').length;
  const managerCount = users.filter((u) => u.role === 'MANAGER').length;
  const activeCount = users.filter((u) => u.is_active === 1).length;
  const activePercentage = totalUsers > 0 ? Math.round((activeCount / totalUsers) * 100) : 100;

  // Open Drawer to Add New User
  const handleOpenAddUser = () => {
    setEditingUserId(undefined);
    setUUsername('');
    setUFullName('');
    setUPassword('');
    setURole('CASHIER');
    setUBranchId(branches.length > 0 ? String(branches[0].id) : '');
    setUActive(1);
    setShowPassword(false);
    setShowDrawer(true);
  };

  // Open Drawer to Edit Existing User
  const handleOpenEditUser = (u: UserSummary, focusPassword = false) => {
    setEditingUserId(u.id);
    setUUsername(u.username);
    setUFullName(u.full_name);
    setUPassword('');
    setURole(u.role);
    setUBranchId(u.branch_id ? String(u.branch_id) : '');
    setUActive(u.is_active);
    setShowPassword(focusPassword);
    setShowDrawer(true);
  };

  // Quick switch active user session
  const handleSwitchUser = (u: UserSummary) => {
    if (u.is_active !== 1) {
      showToast(`Cannot switch to disabled account ${u.username}`, 'error');
      return;
    }
    setActiveUser(u);
    setActiveBranchId(u.branch_id ?? null);
    showToast(`Switched active session to ${u.full_name} (${u.role})`, 'success');
  };

  // Toggle user active status directly
  const handleToggleUserStatus = async (u: UserSummary) => {
    if (u.id === activeUser?.id) {
      showToast('Cannot deactivate your own currently active account', 'error');
      return;
    }
    const newStatus = u.is_active === 1 ? 0 : 1;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'user_update',
          data: {
            id: u.id,
            full_name: u.full_name,
            role: u.role,
            branch_id: u.branch_id,
            is_active: newStatus,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update user status');
      }
      await reloadContext();
      showToast(`User account ${u.username} marked as ${newStatus ? 'Active' : 'Disabled'}`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user status';
      showToast(msg, 'error');
    }
  };

  // Save Add/Edit User Form
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uFullName.trim()) {
      showToast('Full name is required', 'error');
      return;
    }
    if (!editingUserId) {
      if (!uUsername.trim()) {
        showToast('Username is required', 'error');
        return;
      }
      if (!uPassword || uPassword.length < 4) {
        showToast('Password must be at least 4 characters', 'error');
        return;
      }
    } else if (uPassword && uPassword.length < 4) {
      showToast('New password must be at least 4 characters', 'error');
      return;
    }

    setSaving(true);
    try {
      const branchIdNum = uBranchId ? Number(uBranchId) : null;
      if (editingUserId) {
        // Update user
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'user_update',
            data: {
              id: editingUserId,
              full_name: uFullName.trim(),
              role: uRole,
              branch_id: branchIdNum,
              is_active: uActive,
              ...(uPassword.trim() ? { password: uPassword.trim() } : {}),
            },
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to update user account');
        }
        showToast(`User account ${uUsername} updated successfully`, 'success');
      } else {
        // Create user
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'user',
            data: {
              username: uUsername.trim().toLowerCase(),
              full_name: uFullName.trim(),
              password: uPassword.trim(),
              role: uRole,
              branch_id: branchIdNum,
            },
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create user account');
        }
        showToast(`Staff login ${uUsername} created successfully`, 'success');
      }
      await reloadContext();
      setShowDrawer(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving staff account';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Helper for role badge styling
  const renderRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700">
            <Shield className="h-3 w-3 text-purple-600" />
            Super Admin
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
            <UserCheck className="h-3 w-3 text-blue-600" />
            Company Admin
          </span>
        );
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
            <SlidersHorizontal className="h-3 w-3 text-amber-600" />
            Store Manager
          </span>
        );
      case 'CASHIER':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
            <Store className="h-3 w-3 text-emerald-600" />
            POS Cashier
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4 backdrop-blur-xs">
      <div
        className={`flex flex-col rounded-2xl border border-slate-700/80 bg-white shadow-2xl transition-all duration-200 ${
          isMaximized
            ? 'h-[98vh] w-[99vw] max-w-none'
            : 'h-[92vh] max-h-[880px] w-full max-w-6xl'
        }`}
      >
        {/* Executive Midnight Navy Window Header */}
        <div className="flex select-none items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#0a1829] via-[#0f243e] to-[#0a1829] px-4 py-3 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30">
              <UserCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-wide sm:text-base">
                  User Logins &amp; Staff Accounts Directory
                </h2>
                <span className="hidden sm:inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                  Multi-Tenant Security
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tenant: <span className="font-semibold text-slate-200">{settings.business_name}</span> | Cashier Logins, Security Roles &amp; Branch Permissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? 'Expand Window' : 'Minimize Window'}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restore Default Window' : 'Maximize Window'}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={closeUserLoginsModal}
              title="Close (ESC)"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div
            className={`mx-4 mt-2 flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-semibold shadow-md transition-all ${
              toastMessage.type === 'success'
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-900'
                : 'border border-rose-300 bg-rose-50 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="cursor-pointer text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Main Content Body */}
        {!isMinimized && (
          <div className="flex flex-1 flex-col overflow-hidden bg-slate-50/50">
            {/* Top Multi-Tenant Context Banner */}
            <div className="border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                    <Building2 className="h-3.5 w-3.5" />
                  </span>
                  <div className="text-xs">
                    <span className="font-semibold text-slate-500">Active Tenant Scope:</span>{' '}
                    <span className="font-bold text-slate-900">{settings.business_name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                    </span>
                    <span className="font-medium text-slate-500">Logged As:</span>
                    <span className="font-bold text-slate-900">
                      {activeUser?.full_name ?? 'Administrator'}
                    </span>
                    {activeUser && renderRoleBadge(activeUser.role)}
                  </div>
                </div>
              </div>
            </div>

            {/* 5 Executive KPI Metric Cards */}
            <div className="grid grid-cols-2 gap-3 border-b border-slate-200 bg-slate-100/70 p-4 sm:grid-cols-5">
              <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Accounts</span>
                  <Users className="h-4 w-4 text-slate-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold tabular-nums text-slate-900">{totalUsers}</span>
                  <span className="text-[11px] font-semibold text-slate-500">Logins</span>
                </div>
              </div>

              <div className="rounded-xl border border-blue-200/80 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between text-blue-600">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Company Admins</span>
                  <UserCheck className="h-4 w-4 text-blue-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold tabular-nums text-blue-700">{adminCount}</span>
                  <span className="text-[11px] font-semibold text-blue-600">Admins</span>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200/80 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between text-emerald-600">
                  <span className="text-[11px] font-bold uppercase tracking-wider">POS Cashiers</span>
                  <Store className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold tabular-nums text-emerald-700">{cashierCount}</span>
                  <span className="text-[11px] font-semibold text-emerald-600">Cashiers</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200/80 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between text-amber-600">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Store Managers</span>
                  <SlidersHorizontal className="h-4 w-4 text-amber-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold tabular-nums text-amber-700">{managerCount}</span>
                  <span className="text-[11px] font-semibold text-amber-600">Managers</span>
                </div>
              </div>

              <div className="col-span-2 rounded-xl border border-teal-200/80 bg-white p-3 shadow-xs sm:col-span-1">
                <div className="flex items-center justify-between text-teal-600">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Security Status</span>
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold tabular-nums text-teal-700">
                    {activePercentage}%
                  </span>
                  <span className="text-[11px] font-semibold text-teal-600">Active</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 pt-2">
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('directory')}
                  className={`flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition ${
                    activeTab === 'directory'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Staff Accounts Directory</span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold tabular-nums text-slate-700">
                    {filteredUsers.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('hierarchy')}
                  className={`flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition ${
                    activeTab === 'hierarchy'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Role Access &amp; Responsibilities</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('session')}
                  className={`flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition ${
                    activeTab === 'session'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                  }`}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Active Session &amp; Quick Switch</span>
                </button>
              </div>

              <div className="flex items-center gap-2 pb-2">
                <button
                  type="button"
                  onClick={() => void reloadContext()}
                  title="Refresh Users List"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddUser}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:from-emerald-700 hover:to-teal-800"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Register New Staff Account</span>
                </button>
              </div>
            </div>

            {/* TAB 1: USERS DIRECTORY & LEDGER */}
            {activeTab === 'directory' && (
              <div className="flex flex-1 flex-col overflow-hidden p-4">
                {/* Search & Filters Bar */}
                <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                  <div className="relative sm:col-span-5">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by username, full name, role or branch..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs shadow-2xs focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2.5 cursor-pointer text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="sm:col-span-3">
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                    >
                      <option value="ALL">All Security Roles</option>
                      <option value="SUPER_ADMIN">Super Admin (Platform Owner)</option>
                      <option value="ADMIN">Company Admin (Tenant Admin)</option>
                      <option value="MANAGER">Store Manager</option>
                      <option value="CASHIER">POS Cashier (Counter)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <select
                      value={branchFilter}
                      onChange={(e) => setBranchFilter(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                    >
                      <option value="ALL">All Branch Outlets</option>
                      <option value="NONE">Headquarters (All Outlets)</option>
                      {branches.map((b) => (
                        <option key={b.id} value={String(b.id)}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                    >
                      <option value="ALL">All Account Statuses</option>
                      <option value="ACTIVE">Active Accounts Only</option>
                      <option value="DISABLED">Disabled Accounts Only</option>
                    </select>
                  </div>
                </div>

                {/* Users Table */}
                <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700">
                        <th className="px-3 py-2.5 text-center">Sr #</th>
                        <th className="px-3 py-2.5 text-center">Login Username</th>
                        <th className="px-3 py-2.5 text-center">Full Name &amp; Staff Title</th>
                        <th className="px-3 py-2.5 text-center">Security Role</th>
                        <th className="px-3 py-2.5 text-center">Assigned Branch Outlet</th>
                        <th className="px-3 py-2.5 text-center">Account Status</th>
                        <th className="px-3 py-2.5 text-center">Active Session</th>
                        <th className="px-3 py-2.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
                            <p className="font-semibold">No staff accounts match your filters</p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Try clearing filters or click &quot;Register New Staff Account&quot; to add a user.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u, idx) => {
                          const isCurrentUser = activeUser?.id === u.id;
                          return (
                            <tr
                              key={u.id}
                              className={`transition hover:bg-slate-50/80 ${
                                isCurrentUser ? 'bg-emerald-50/40' : ''
                              }`}
                            >
                              {/* Sr # */}
                              <td className="px-3 py-2.5 text-center tabular-nums font-semibold text-slate-500">
                                {idx + 1}
                              </td>

                              {/* Username */}
                              <td className="px-3 py-2.5 text-center">
                                <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800 ring-1 ring-slate-200">
                                  {u.username}
                                </span>
                              </td>

                              {/* Full Name */}
                              <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                                {u.full_name}
                              </td>

                              {/* Role */}
                              <td className="px-3 py-2.5 text-center">
                                {renderRoleBadge(u.role)}
                              </td>

                              {/* Assigned Branch Outlet */}
                              <td className="px-3 py-2.5 text-center">
                                {u.branch_name ? (
                                  <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                                    <Store className="h-3 w-3 text-emerald-600" />
                                    {u.branch_name}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-slate-500 font-medium italic">
                                    <Building2 className="h-3 w-3 text-slate-400" />
                                    All Company Outlets (Headquarters)
                                  </span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="px-3 py-2.5 text-center">
                                {u.is_active === 1 ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                                    Disabled
                                  </span>
                                )}
                              </td>

                              {/* Quick Session Switch */}
                              <td className="px-3 py-2.5 text-center">
                                {isCurrentUser ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-100/70 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800">
                                    <span className="relative flex h-2 w-2">
                                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
                                    </span>
                                    Current Active
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSwitchUser(u)}
                                    disabled={u.is_active !== 1}
                                    title={`Switch session to ${u.username}`}
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 shadow-2xs transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <LogOut className="h-3 w-3 text-slate-400" />
                                    <span>Switch To</span>
                                  </button>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-3 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditUser(u, false)}
                                    title="Edit User Profile"
                                    className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 shadow-2xs hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditUser(u, true)}
                                    title="Reset Password / Security PIN"
                                    className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 shadow-2xs hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition"
                                  >
                                    PIN
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleToggleUserStatus(u)}
                                    disabled={isCurrentUser}
                                    title={u.is_active === 1 ? 'Disable Account' : 'Activate Account'}
                                    className={`cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-bold shadow-2xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                      u.is_active === 1
                                        ? 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50'
                                        : 'border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                  >
                                    {u.is_active === 1 ? 'Disable' : 'Enable'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Info */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Showing <strong className="tabular-nums text-slate-700">{filteredUsers.length}</strong> of{' '}
                    <strong className="tabular-nums text-slate-700">{totalUsers}</strong> configured staff logins
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Multi-tenant data isolation active across all cashier terminals
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: ROLE ACCESS & RESPONSIBILITIES HIERARCHY */}
            {activeTab === 'hierarchy' && (
              <div className="flex-1 overflow-auto p-4 sm:p-6">
                <div className="mx-auto max-w-5xl space-y-6">
                  {/* Executive Notice */}
                  <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-blue-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-blue-600 p-2 text-white shadow-xs">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-blue-900">
                          Multi-Tenant Enterprise Security &amp; Access Hierarchy
                        </h3>
                        <p className="mt-0.5 text-xs text-blue-800 leading-relaxed">
                          Antigravity ERP POS enforces strict multi-tenant separation. Each client company operates in complete data isolation. Staff logins are assigned specific roles that strictly govern access to physical branch counters, catalog pricing, and financial ledgers.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4 Role Cards */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Super Admin */}
                    <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
                            <Shield className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-purple-900">Super Admin</h4>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                              Software Owner (Faisal)
                            </span>
                          </div>
                        </div>
                        <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-800">
                          Platform Root
                        </span>
                      </div>
                      <ul className="mt-3 space-y-2 text-xs text-slate-600">
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-purple-600" />
                          <span>Exclusive authority to create and provision new client companies / tenants</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-purple-600" />
                          <span>Exclusive right to add and license physical branches and FBR POS counters</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-purple-600" />
                          <span>Global system backup utility and transaction ledger clear safety rights</span>
                        </li>
                      </ul>
                    </div>

                    {/* Company Admin */}
                    <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                            <UserCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-blue-900">Company Admin</h4>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                              Client Managing Director
                            </span>
                          </div>
                        </div>
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-800">
                          Tenant Executive
                        </span>
                      </div>
                      <ul className="mt-3 space-y-2 text-xs text-slate-600">
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-blue-600" />
                          <span>Manages master catalog items, price levels, and sales tax classifications</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-blue-600" />
                          <span>Creates and manages POS cashier accounts and store supervisor logins</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-blue-600" />
                          <span>Full visibility across all branch sales registers, GST tax audits, and closing reports</span>
                        </li>
                      </ul>
                    </div>

                    {/* Store Manager */}
                    <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                            <SlidersHorizontal className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-amber-900">Store Manager</h4>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                              Outlet Supervisor
                            </span>
                          </div>
                        </div>
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                          Branch In-charge
                        </span>
                      </div>
                      <ul className="mt-3 space-y-2 text-xs text-slate-600">
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-amber-600" />
                          <span>Records and audits inventory opening balances and batch stock adjustments</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-amber-600" />
                          <span>Supervises daily cash drawer closing and verifies counted currency variance</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-amber-600" />
                          <span>Authorizes sales returns, discounts, and held cart recall operations</span>
                        </li>
                      </ul>
                    </div>

                    {/* POS Cashier */}
                    <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                            <Store className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-emerald-900">POS Cashier</h4>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                              Counter Billing Staff
                            </span>
                          </div>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          Front Desk Operator
                        </span>
                      </div>
                      <ul className="mt-3 space-y-2 text-xs text-slate-600">
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Express barcode scanning, search and checkout on assigned POS terminal</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Generates thermal sales receipts with QR codes and FBR verification</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Submits shift cash drawer count at day closing (locked to assigned branch)</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Capabilities Comparison Matrix Table */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Role Capabilities Comparison Matrix
                      </h4>
                    </div>
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700">
                          <th className="px-4 py-2.5">System Capability / Operational Action</th>
                          <th className="px-3 py-2.5 text-center">Super Admin</th>
                          <th className="px-3 py-2.5 text-center">Company Admin</th>
                          <th className="px-3 py-2.5 text-center">Store Manager</th>
                          <th className="px-3 py-2.5 text-center">POS Cashier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">
                            Create New Branches &amp; FBR POS Terminals
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-purple-700">Yes (Exclusive)</td>
                          <td className="px-3 py-2.5 text-center font-semibold text-rose-500">Restricted</td>
                          <td className="px-3 py-2.5 text-center font-semibold text-rose-500">Restricted</td>
                          <td className="px-3 py-2.5 text-center font-semibold text-rose-500">Restricted</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">
                            Create &amp; Manage Staff Cashier Logins
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-600">Yes</td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-600">Yes</td>
                          <td className="px-3 py-2.5 text-center font-semibold text-rose-500">View Only</td>
                          <td className="px-3 py-2.5 text-center font-semibold text-rose-500">Restricted</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">
                            Catalog Items, Prices &amp; Sales Tax Rates
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-600">Yes</td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-600">Yes</td>
                          <td className="px-3 py-2.5 text-center font-semibold text-amber-600">View Only</td>
                          <td className="px-3 py-2.5 text-center font-semibold text-slate-400">Read in POS</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">
                            Perform Live POS Checkout &amp; Print Invoices
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-600">Yes</td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-600">Yes</td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-600">Yes</td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-600">Yes</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">
                            Day Closing &amp; Cash Drawer Reconciliation
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-600">Audit All</td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-600">Audit All</td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-600">Branch Supervise</td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-600">Shift Count</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">
                            GST Tax Summary &amp; FBR Sync Logs
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-600">Full Audit</td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-600">Full Audit</td>
                          <td className="px-3 py-2.5 text-center font-semibold text-rose-500">Restricted</td>
                          <td className="px-3 py-2.5 text-center font-semibold text-rose-500">Restricted</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ACTIVE SESSION & FAST SWITCHER */}
            {activeTab === 'session' && (
              <div className="flex-1 overflow-auto p-4 sm:p-6">
                <div className="mx-auto max-w-4xl space-y-6">
                  {/* Current Active Session Card */}
                  <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-5 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
                          <User className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                              Active Staff Session
                            </span>
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                            </span>
                          </div>
                          <h3 className="text-base font-extrabold text-slate-900">
                            {activeUser?.full_name ?? 'Default Administrator'}
                          </h3>
                          <p className="text-xs text-slate-600">
                            Username: <strong className="font-semibold text-slate-800">{activeUser?.username ?? 'admin'}</strong>
                            {' | '}
                            Assigned Branch:{' '}
                            <strong className="font-semibold text-slate-800">
                              {activeUser?.branch_name ?? 'All Outlets (Headquarters)'}
                            </strong>
                          </p>
                        </div>
                      </div>

                      <div>{activeUser && renderRoleBadge(activeUser.role)}</div>
                    </div>
                  </div>

                  {/* Fast Switch User Cards */}
                  <div>
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
                      Switch Active Session (1-Click Switch For Multi-Tenant Verification)
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {users.map((u) => {
                        const isCurrent = activeUser?.id === u.id;
                        return (
                          <div
                            key={u.id}
                            className={`rounded-2xl border p-4 transition ${
                              isCurrent
                                ? 'border-emerald-300 bg-emerald-50/50 shadow-xs'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800">
                                  {u.username}
                                </span>
                                <h5 className="mt-1.5 text-xs font-bold text-slate-900">{u.full_name}</h5>
                                <p className="text-[11px] text-slate-500">
                                  {u.branch_name ?? 'All Company Outlets'}
                                </p>
                              </div>
                              {renderRoleBadge(u.role)}
                            </div>

                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                              <span className="text-[10px] font-semibold text-slate-400">
                                Status: {u.is_active ? 'Active' : 'Disabled'}
                              </span>

                              {isCurrent ? (
                                <span className="text-[11px] font-bold text-emerald-700">Current Session</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSwitchUser(u)}
                                  disabled={u.is_active !== 1}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <LogOut className="h-3 w-3" />
                                  <span>Switch</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2.5 rounded-b-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold">Shortcut:</span>
            <kbd className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
              ESC
            </kbd>
            <span>Closes drawer or window</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeUserLoginsModal}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>

      {/* Slide-over Drawer for Add / Edit User */}
      {showDrawer && (
        <div className="fixed inset-0 z-60 flex items-center justify-end bg-slate-950/40 backdrop-blur-2xs">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#0a1829] to-[#0f243e] px-5 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 ring-1 ring-emerald-400/30">
                  <UserPlus className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    {editingUserId ? `Update Staff Account: ${uUsername}` : 'Register New Staff Account'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {editingUserId
                      ? 'Edit staff profile details or reset security PIN'
                      : 'Create a new cashier or manager login for this company'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Form */}
            <form onSubmit={handleSaveUser} className="flex flex-1 flex-col justify-between overflow-y-auto p-5">
              <div className="space-y-4">
                {/* Username */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Login Username / ID
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingUserId)}
                    placeholder="e.g. cashier.timergara"
                    value={uUsername}
                    onChange={(e) => setUUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs shadow-2xs focus:border-emerald-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Unique alphanumeric login identifier (lowercase, dots and dashes allowed)
                  </p>
                </div>

                {/* Full Name */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Full Name &amp; Staff Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bilal Khan (Senior Cashier)"
                    value={uFullName}
                    onChange={(e) => setUFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Security Access Role
                  </label>
                  <select
                    value={uRole}
                    onChange={(e) => setURole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                  >
                    <option value="CASHIER">POS Cashier (Counter Sales &amp; Returns)</option>
                    <option value="MANAGER">Store Manager (Supervises Stock &amp; Closing)</option>
                    <option value="ADMIN">Company Admin (Tenant Full Access)</option>
                    {isSuperAdmin && (
                      <option value="SUPER_ADMIN">Super Admin (Platform Root Owner)</option>
                    )}
                  </select>
                </div>

                {/* Assigned Branch Outlet */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Assigned Branch Outlet
                  </label>
                  <select
                    value={uBranchId}
                    onChange={(e) => setUBranchId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                  >
                    <option value="">All Company Outlets (Headquarters / Admin)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {b.name} ({b.code}) - {b.address || 'Retail Counter'}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-400">
                    POS Cashiers should be locked to their specific physical branch counter
                  </p>
                </div>

                {/* Password / Security PIN */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      {editingUserId ? 'Reset Password / Security PIN' : 'Password / Security PIN'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="cursor-pointer text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      <span>{showPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUserId}
                      placeholder={editingUserId ? 'Leave blank to keep existing password' : 'Min 4 characters (e.g. 1234)'}
                      value={uPassword}
                      onChange={(e) => setUPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  {editingUserId && (
                    <p className="mt-1 text-[10px] text-amber-600">
                      Only enter a value if you wish to reset the password or counter PIN for this staff member
                    </p>
                  )}
                </div>

                {/* Account Active Status */}
                {editingUserId && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uActive === 1}
                        onChange={(e) => setUActive(e.target.checked ? 1 : 0)}
                        className="h-4 w-4 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Account is Active and Authorized to Login</span>
                    </label>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Uncheck to temporarily suspend login access for this staff member
                    </p>
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="mt-6 flex items-center gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="flex-1 cursor-pointer rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 cursor-pointer rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 py-2 text-xs font-bold text-white shadow-xs hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>{editingUserId ? 'Save Changes' : 'Create Account'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
