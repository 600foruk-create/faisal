'use client';

export function TopBrandBar() {
  return (
    <div className="no-print w-full border-b border-slate-800/80 bg-[#08131f] text-white shadow-sm">
      <div className="mx-auto flex h-13 max-w-[1440px] items-center justify-between px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-1.5 text-sm sm:text-base">
          <span className="shrink-0 font-bold tracking-tight text-white">Softifyx</span>
          <span className="truncate font-semibold tracking-wide text-[#38bdf8]">
            - M/S SEASTONE PVC PIPE INDUSTRIES
          </span>
        </div>

        <div
          className="flex h-10 w-11 shrink-0 flex-col items-center justify-center rounded-md bg-white px-1 py-0.5 shadow-sm"
          title="Seastone PVC Pipes"
        >
          <svg
            viewBox="0 0 64 52"
            className="h-full w-full"
            aria-label="Seastone PVC Pipes Logo"
          >
            {/* Stylized S */}
            <path
              d="M27 7H14C9.5 7 7 9.8 7 13.5C7 17.2 9.5 19.5 14 20.5L22 22.3C26.5 23.3 29 25.8 29 29.5C29 33.5 25.8 36 21 36H8"
              fill="none"
              stroke="#ea580c"
              strokeWidth="5.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Stylized P / Pipe Curve */}
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
        </div>
      </div>
    </div>
  );
}

