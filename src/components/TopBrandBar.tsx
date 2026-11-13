'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePosContext } from './PosContext';

export function TopBrandBar() {
  const { settings, activeUser } = usePosContext();
  const pathname = usePathname();
  const isPosSale = pathname === '/sale';

  return (
    <div
      className={`no-print relative z-40 w-full transition-colors ${
        isPosSale
          ? 'border-b-2 border-amber-600/80 bg-gradient-to-r from-[#3B1405] via-[#4A1B07] to-[#3B1405] text-white shadow-md'
          : 'border-b-2 border-emerald-500/80 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#0b1830] text-white'
      }`}
    >
      <div
        className={`mx-auto flex min-h-14 items-center justify-between gap-4 px-4 py-2 sm:px-6 ${
          isPosSale ? 'max-w-[1660px]' : 'max-w-[1520px]'
        }`}
      >
        {/* Left: Software Brand - Company Name */}
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          {isPosSale && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 font-black text-white shadow-2xs">
              S
            </div>
          )}
          <div className="min-w-0 leading-tight">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-xl font-extrabold tracking-tight text-white sm:text-[25px]">
                {settings.software_brand || 'Softifyx'}
              </span>
              <span
                className={`truncate text-base font-bold tracking-wide sm:text-[22px] ${
                  isPosSale ? 'text-amber-300' : 'text-amber-400'
                }`}
              >
                - {settings.business_name || 'M/S SEASTONE PVC PIPE INDUSTRY'}
              </span>
            </div>
          </div>
        </Link>

        {/* Right: User / Terminal info + Company Logo Badge */}
        <div className="flex items-center gap-3">
          {isPosSale && (
            <div className="hidden items-center gap-2 rounded-lg bg-black/25 px-3 py-1 text-xs sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
              <span className="font-semibold text-amber-100">
                {activeUser?.full_name || activeUser?.username || 'Administrator'}
              </span>
              <span className="text-[10px] text-amber-300/80 font-mono">(POS Counter)</span>
            </div>
          )}

          <Link
            href="/"
            className="flex h-10 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-0.5 shadow-sm transition hover:scale-105"
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
    </div>
  );
}
