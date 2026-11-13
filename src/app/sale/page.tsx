'use client';

import React from 'react';
import { PosSaleModal } from '@/components/PosSaleModal';
import MainDashboardPage from '../page';

export default function PosSaleRoutePage() {
  return (
    <>
      {/* Background Dashboard */}
      <MainDashboardPage />

      {/* Foreground Floating POS Sale Form Window */}
      <PosSaleModal />
    </>
  );
}
