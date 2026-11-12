'use client';

import { usePosContext } from './PosContext';

export function AppFooter() {
  const { settings } = usePosContext();
  return (
    <footer className="no-print border-t border-slate-200/80 bg-white/90 py-1.5 text-center text-[11px] font-medium text-slate-500">
      {settings.footer_text || 'Designed & Developed by Softifyx Technologies'}
    </footer>
  );
}

