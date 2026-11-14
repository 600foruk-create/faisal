'use client';

import React, { useEffect } from 'react';
import { usePosContext } from '@/components/PosContext';
import MainDashboardPage from '../page';

export default function PosSaleRoutePage() {
  const { openPosSale } = usePosContext();

  useEffect(() => {
    openPosSale();
  }, [openPosSale]);

  return <MainDashboardPage />;
}
