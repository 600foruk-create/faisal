'use client';

import Link from 'next/link';
import { usePosContext } from './PosContext';

export function TopBrandBar() {
  const { settings } = usePosContext();

  return (
    <div className="no-print relative z-40 w-full border-b-2 border-emerald-500/80 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#0b1830] text-white">
      <div className="mx-auto flex min-h-16 max-w-[1560px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Left: Software Brand - Company Name */}
        <Link href="/" className="flex min-w-0 items-center">
          <div className="min-w-0 leading-tight">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-xl font-extrabold tracking-tight text-white sm:text-[26px]">
                {settings.software_brand || 'Softifyx'}
              </span>
              <span className="truncate text-base font-bold tracking-wide text-amber-400 sm:text-[23px]">
                - {settings.business_name || 'M/S SEASTONE PVC PIPE INDUSTRY'}
              </span>
            </div>
          </div>
        </Link>

        {/* Right: Company Logo Badge */}
        <Link
          href="/"
          className="flex h-11 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-0.5 shadow-sm transition hover:scale-105"
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
  );
}
