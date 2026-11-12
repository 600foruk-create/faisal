'use client';

import { usePosContext } from './PosContext';

export function AppFooter() {
  const { settings } = usePosContext();
  return (
    <footer className="no-print border-t border-slate-200/80 bg-white/80 py-3 text-center text-xs font-medium text-slate-500">
      {settings.footer_text || 'Designed & Developed by Softifyx Technologies'}
    </footer>
  );
}

