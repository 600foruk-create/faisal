# Seastone Multi-Branch Retail POS & FBR Digital Invoicing

A multi-branch Retail Point of Sale (POS) and Sales Management System with Pakistan FBR POS / Digital Invoicing integration.

## Features

- **Main Dashboard**: Consolidated and branch-filtered KPIs (`Today's Sale`, `Total Invoices`, `Cash Received`, `FBR Pending`), date range & period presets, and `Recent Invoices` table with instant receipt modal.
- **POS Sale (`/sale`)**: Barcode/SKU/name search, category filters, branch inventory deduction, customer selection & quick creation, Cash/Card/Bank/Split payments, and `Simulate FBR Offline` testing toggle.
- **Sales Register (`/register`)**: Full invoice search & filter (branch, date range, FBR status, payment mode, sales/returns), bulk `Sync All Pending` to FBR, and CSV export.
- **Sales Return (`/returns`)**: Partial/full returns against original invoices with over-return validation, automatic stock restoration, and FBR credit-note submission.
- **Hold / Recall (`/hold`)**: Park incomplete bills and recall them back to the POS cart.
- **Day Closing (`/closing`)**: Shift/end-of-day cash reconciliation (Z-Report) with opening float, expected cash, counted cash, variance calculation, and history.
- **Reports (`/reports`)**: Branch comparison, top selling products, GST/tax summary, and FBR API sync audit logs.
- **Settings (`/settings`)**: Branches & FBR terminals (`POSID`, Bearer Token, `MOCK` / `SANDBOX` / `PRODUCTION`), product catalog & branch stock, business receipt details, customers, and users.

## Quick Start (Windows PowerShell)

> Note: If Windows PowerShell restricts `.ps1` scripts, use `npm.cmd` instead of `npm`.

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000` in your browser.

For a production build:

```powershell
npm.cmd run build
npm.cmd run start
```

Run automated tests:

```powershell
npm.cmd test
```

## Demo Credentials & Seeded Branches

- **Admin**: `admin` / `admin123` (All Branches Consolidated)
- **Timergara Cashier**: `cashier.timergara` / `1234` (`SWT-A-POS`)
- **Mingora Cashier**: `cashier.mingora` / `1234` (`SWT-B-POS`)

## FBR Configuration

By default, terminals run in **`MOCK`** mode so invoices fiscalize locally and generate scannable QR codes immediately. To connect to FBR IRIS:

1. Go to **Settings -> Branches & FBR Terminals**.
2. Edit a branch and set `FBR POSID`, `FBR IRIS Bearer Token`, and switch mode to `SANDBOX` or `PRODUCTION`.
