import { NextResponse } from 'next/server';

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(err: unknown, fallbackStatus = 400) {
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  return NextResponse.json({ error: message }, { status: fallbackStatus });
}

export function parseOptionalInt(val: string | null): number | null {
  if (!val || val === 'ALL' || val === 'all') return null;
  const num = Number(val);
  return Number.isInteger(num) && num > 0 ? num : null;
}

