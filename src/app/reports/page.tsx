'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BarChart3, Package, ReceiptText } from 'lucide-react';
import { usePosContext } from '@/components/PosContext';
import { formatCurrency, getDateRangeForPreset } from '@/lib/format';

interface ReportsPayload {
  branchComparison: Array<{
    branch_id: number;
    display_name: string;
    invoice_count: number;
    gross_sales: number;
    returns_total: number;
    net_sales: number;
    net_tax: number;
  }>;
  topProducts: Array<{
    product_id: number;
    sku: string;
    item_name: string;
    net_qty: number;
    net_revenue: number;
    net_tax: number;
  }>;
  taxSummary: {
    taxable_sales: number;
    output_tax: number;
    return_taxable: number;
    return_tax: number;
    net_tax_payable: number;
  };
}

function ReportsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const { branches, activeBranchId, settings, refreshNonce } = usePosContext();
  const range = getDateRangeForPreset('month');

  const [branchId, setBranchId] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState(range.from);
  const [toDate, setToDate] = useState(range.to);
  const [tab, setTab] = useState<'branches' | 'products' | 'tax'>('branches');
  const [report, setReport] = useState<ReportsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tabParam && ['branches', 'products', 'tax'].includes(tabParam)) {
      setTab(tabParam as 'branches' | 'products' | 'tax');
    }
  }, [tabParam]);

  useEffect(() => {
    setBranchId(activeBranchId ? String(activeBranchId) : 'ALL');
  }, [activeBranchId]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ branchId, fromDate, toDate });
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        setReport((await res.json()) as ReportsPayload);
      }
    } finally {
      setLoading(false);
    }
  }, [branchId, fromDate, toDate]);

  useEffect(() => {
    void loadReports();
  }, [loadReports, refreshNonce]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                POS Business Reports
              </h1>
              <p className="text-xs text-slate-500">
                Branch performance, best-selling products &amp; sales tax summary
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800"
            >
              <option value="ALL">All Branches (Consolidated)</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {(
            [
              { key: 'branches', label: 'Branch Comparison', icon: BarChart3 },
              { key: 'products', label: 'Top Selling Products', icon: Package },
              { key: 'tax', label: 'GST / Tax Summary', icon: ReceiptText },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                tab === key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        {loading && <p className="py-10 text-center text-sm text-slate-500">Generating report...</p>}

        {!loading && report && tab === 'branches' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3 text-right">Sale Bills</th>
                  <th className="px-4 py-3 text-right">Gross Sales</th>
                  <th className="px-4 py-3 text-right">Returns</th>
                  <th className="px-4 py-3 text-right">Net Sales</th>
                  <th className="px-4 py-3 text-right">Net Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.branchComparison.map((row) => (
                  <tr key={row.branch_id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.display_name}</td>
                    <td className="tabular-nums px-4 py-3 text-right">{row.invoice_count}</td>
                    <td className="tabular-nums px-4 py-3 text-right">
                      {formatCurrency(row.gross_sales, settings.currency_symbol)}
                    </td>
                    <td className="tabular-nums px-4 py-3 text-right text-rose-700">
                      -{formatCurrency(row.returns_total, settings.currency_symbol)}
                    </td>
                    <td className="tabular-nums px-4 py-3 text-right font-bold text-slate-900">
                      {formatCurrency(row.net_sales, settings.currency_symbol)}
                    </td>
                    <td className="tabular-nums px-4 py-3 text-right">
                      {formatCurrency(row.net_tax, settings.currency_symbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && report && tab === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3 text-right">Net Sold Qty</th>
                  <th className="px-4 py-3 text-right">Net Revenue</th>
                  <th className="px-4 py-3 text-right">Tax Charged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.topProducts.map((p) => (
                  <tr key={p.product_id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{p.item_name}</td>
                    <td className="tabular-nums px-4 py-3 text-right font-semibold">{p.net_qty}</td>
                    <td className="tabular-nums px-4 py-3 text-right font-bold">
                      {formatCurrency(p.net_revenue, settings.currency_symbol)}
                    </td>
                    <td className="tabular-nums px-4 py-3 text-right">
                      {formatCurrency(p.net_tax, settings.currency_symbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && report && tab === 'tax' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Taxable Sales Value</p>
              <p className="tabular-nums mt-1 text-lg font-bold">
                {formatCurrency(report.taxSummary.taxable_sales, settings.currency_symbol)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Output Sales Tax</p>
              <p className="tabular-nums mt-1 text-lg font-bold text-sky-700">
                {formatCurrency(report.taxSummary.output_tax, settings.currency_symbol)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Return Taxable Value</p>
              <p className="tabular-nums mt-1 text-lg font-bold text-rose-700">
                -{formatCurrency(report.taxSummary.return_taxable, settings.currency_symbol)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Return Tax Credit</p>
              <p className="tabular-nums mt-1 text-lg font-bold text-rose-700">
                -{formatCurrency(report.taxSummary.return_tax, settings.currency_symbol)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-700">Net Tax / GST Payable</p>
              <p className="tabular-nums mt-1 text-lg font-bold text-emerald-900">
                {formatCurrency(report.taxSummary.net_tax_payable, settings.currency_symbol)}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="rounded-2xl bg-white p-6 text-sm">Loading reports...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
