import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCategories, saveCategory, deleteCategory } from '@/lib/pos-service';

export async function GET() {
  try {
    const db = getDb();
    const categories = getCategories(db);
    return NextResponse.json({ categories });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch categories';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      id?: number | string;
      code: string;
      name: string;
      category_type?: string;
      parent_code?: string | null;
    };

    if (!body.code || !body.name) {
      return NextResponse.json({ error: 'Category code and name are required' }, { status: 400 });
    }

    const db = getDb();
    const category = saveCategory(db, body);
    return NextResponse.json({ category }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'Category code is required' }, { status: 400 });
    }

    const db = getDb();
    deleteCategory(db, code);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

