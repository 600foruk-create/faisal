import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '../../../lib/api-utils.ts';
import { getDb } from '../../../lib/db.ts';
import {
  authenticateUser,
  getBranchesWithTerminals,
  getBusinessSettings,
  getUsers,
} from '../../../lib/pos-service.ts';

export async function GET() {
  try {
    const db = getDb();
    const { branches, terminals } = getBranchesWithTerminals(db);
    const users = getUsers(db);
    const settings = getBusinessSettings(db);
    return jsonOk({ branches, terminals, users, settings });
  } catch (err) {
    return jsonError(err, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { username?: string; password?: string };
    if (!body.username || !body.password) {
      return jsonError(new Error('Username and password are required'), 400);
    }
    const db = getDb();
    const user = authenticateUser(db, body.username, body.password);
    if (!user) {
      return jsonError(new Error('Invalid username or password'), 401);
    }
    return jsonOk({ user });
  } catch (err) {
    return jsonError(err, 500);
  }
}

