'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, CloudUpload, Package, ReceiptText, XCircle } from 'lucide-react';
import { usePosContext } from '@/components/PosContext';
import { formatCurrency, getDateRangeForPreset } from '@/lib/format';
import type { FbrSyncLogRecord } from '@/lib/types';

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
  fbrLogs: FbrSyncLogRecord[];
}

export default function ReportsPage() {
  const { branches, activeBranchId, settings, refreshNonce } = usePosContext();
  const range = getDateRangeForPreset('month');

  const [branchId, setBranchId] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState(range.from);
  const [toDate, setToDate] = useState(range.to);
  const [tab, setTab] = useState<'branches' | 'products' | 'tax' | 'fbr'>('branches');
  const [report, setReport] = useState<ReportsPayload | null>(null);
  const [loading, setLoading] = useState(true);

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
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-600" />
            <h1 className="text-lg font-bold text-slate-900">Reports & FBR Audit Logs</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5"
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
              className="rounded-lg border border-slate-300 px-2.5 py-1.5"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {(
            [
              { key: 'branches', label: 'Branch Comparison', icon: BarChart3 },
              { key: 'products', label: 'Top Selling Products', icon: Package },
              { key: 'tax', label: 'GST / Tax Summary', icon: ReceiptText },
              { key: 'fbr', label: 'FBR Audit Logs', icon: CloudUpload },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                tab === key
                  ? 'bg-[#49210a] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading && <p className="py-10 text-center text-sm text-slate-500">Generating report...</p>}

        {!loading && report && tab === 'branches' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3 text-right">Sale Invoices</th>
                  <th className="px-4 py-3 text-right">Gross Sales</th>
                  <th className="px-4 py-3 text-right">Returns</th>
                  <th className="px-4 py-3 text-right">Net Sales</th>
                  <th className="px-4 py-3 text-right">Net GST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.branchComparison.map((row) => (
                  <tr key={row.branch_id}>
                    <td className="px-4 py-3 font-semibold">{row.display_name}</td>
                    <td className="px-4 py-3 text-right">{row.invoice_count}</td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(row.gross_sales, settings.currency_symbol)}
                    </td>
                    <td className="px-4 py-3 text-right text-rose-700">
                      -{formatCurrency(row.returns_total, settings.currency_symbol)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatCurrency(row.net_sales, settings.currency_symbol)}
                    </td>
                    <td className="px-4 py-3 text-right">
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
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3 text-right">Net Sold Qty</th>
                  <th className="px-4 py-3 text-right">Net Revenue</th>
                  <th className="px-4 py-3 text-right">GST Charged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.topProducts.map((p) => (
                  <tr key={p.product_id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{p.item_name}</td>
                    <td className="px-4 py-3 text-right font-semibold">{p.net_qty}</td>
                    <td className="px-4 py-3 text-right font-bold">
                      {formatCurrency(p.net_revenue, settings.currency_symbol)}
                    </td>
                    <td className="px-4 py-3 text-right">
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
              <p className="mt-1 text-lg font-bold">
                {formatCurrency(report.taxSummary.taxable_sales, settings.currency_symbol)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Output Sales Tax</p>
              <p className="mt-1 text-lg font-bold text-sky-700">
                {formatCurrency(report.taxSummary.output_tax, settings.currency_symbol)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Return Taxable Value</p>
              <p className="mt-1 text-lg font-bold text-rose-700">
                -{formatCurrency(report.taxSummary.return_taxable, settings.currency_symbol)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Return Tax Credit</p>
              <p className="mt-1 text-lg font-bold text-rose-700">
                -{formatCurrency(report.taxSummary.return_tax, settings.currency_symbol)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-700">Net FBR Tax Payable</p>
              <p className="mt-1 text-lg font-bold text-emerald-900">
                {formatCurrency(report.taxSummary.net_tax_payable, settings.currency_symbol)}
              </p>
            </div>
          </div>
        )}

        {!loading && report && tab === 'fbr' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="px-3 py-2.5">Timestamp</th>
                  <th className="px-3 py-2.5">Invoice No</th>
                  <th className="px-3 py-2.5">USIN</th>
                  <th className="px-3 py-2.5">POSID / Mode</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">FBR Invoice No / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.fbrLogs.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2.5 text-slate-500">{l.created_at}</td>
                    <td className="px-3 py-2.5 font-bold">{l.invoice_no}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px]">{l.usin}</td>
                    <td className="px-3 py-2.5">
                      {l.fbr_pos_id} ({l.mode})
                    </td>
                    <td className="px-3 py-2.5">
                      {l.success ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          OK ({l.http_status})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-red-600">
                          <XCircle className="h-3.5 w-3.5" />
                          Failed ({l.http_status ?? 'NET'})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px]">
                      {l.fbr_invoice_no ?? l.error_message ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

