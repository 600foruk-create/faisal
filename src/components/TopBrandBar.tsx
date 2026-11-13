'use client';

import Link from 'next/link';
import { usePosContext } from './PosContext';
import { SoftifyxLogo } from './SoftifyxLogo';

export function TopBrandBar() {
  const { settings, branches, activeBranchId } = usePosContext();

  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? null;

  return (
    <header className="no-print relative z-40 w-full border-b border-amber-600/40 bg-gradient-to-b from-[#562208] via-[#65280B] to-[#501F07] text-white shadow-lg">
      <div className="mx-auto flex max-w-[1520px] flex-col items-center justify-between gap-3 px-3 py-2 sm:px-6 md:flex-row md:gap-4 md:py-2.5">
        {/* Left: Softifyx Brand Logo Badge (Exact Official Logo) */}
        <div className="flex w-full items-center justify-start md:w-auto md:min-w-[210px]">
          <Link href="/" className="inline-block transition hover:opacity-95" title="Softifyx Financial Accounting Software">
            <SoftifyxLogo />
          </Link>
        </div>

        {/* Center: SOFTIFYX - LICENSED TO - Business Name Oval Pill */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Link href="/" className="group flex flex-col items-center">
            <h1 className="text-xl font-black tracking-[0.2em] text-[#FBBF24] drop-shadow-sm transition group-hover:text-amber-300 sm:text-2xl lg:text-[28px]">
              {settings.software_brand?.toUpperCase() || 'SOFTIFYX'}
            </h1>
            <span className="mt-0.5 text-[10px] font-bold tracking-[0.28em] text-amber-200/90 uppercase sm:text-[11px]">
              LICENSED TO
            </span>
            <div className="mt-1 inline-flex items-center rounded-full border-2 border-amber-400/90 bg-[#3F1907]/95 px-5 py-0.5 shadow-md shadow-black/40 ring-1 ring-amber-500/20 sm:px-8 sm:py-1">
              <span className="text-xs font-black tracking-wide text-white drop-shadow-xs sm:text-sm lg:text-[15px]">
                {settings.business_name || 'M/S SEASTONE PVC PIPE INDUSTRY'}
              </span>
            </div>
          </Link>
        </div>

        {/* Right: Balance & Status Pill / Company Emblem (Even Better Executive Touch) */}
        <div className="hidden w-full items-center justify-end gap-2.5 md:flex md:w-auto md:min-w-[210px]">
          {activeBranch && (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-[#3A1706]/80 px-3 py-1 text-right text-[11px] text-amber-100 shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="max-w-[130px] truncate font-semibold">
                {activeBranch.display_name}
              </span>
            </div>
          )}

          <Link
            href="/"
            className="flex h-10 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-amber-400/40 bg-white p-0.5 shadow-md transition hover:scale-105"
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
          </Link>
        </div>
      </div>
    </header>
  );
}
