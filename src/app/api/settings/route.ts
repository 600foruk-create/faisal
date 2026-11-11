import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '../../../lib/api-utils.ts';
import { getDb } from '../../../lib/db.ts';
import {
  createUser,
  getBranchesWithTerminals,
  getBusinessSettings,
  getUsers,
  saveBranchAndTerminal,
  updateBusinessSettings,
} from '../../../lib/pos-service.ts';
import type { BusinessSettings, FbrMode, UserRole } from '../../../lib/types.ts';

export async function GET() {
  try {
    const db = getDb();
    const { branches, terminals } = getBranchesWithTerminals(db);
    const settings = getBusinessSettings(db);
    const users = getUsers(db);
    return jsonOk({ settings, branches, terminals, users });
  } catch (err) {
    return jsonError(err, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as
      | { action: 'business'; data: Partial<BusinessSettings> }
      | {
          action: 'branch_terminal';
          data: {
            branchId?: number;
            code: string;
            name: string;
            address: string;
            phone: string;
            terminalId?: number;
            terminalCode: string;
            invoicePrefix: string;
            fbrPosId: string;
            fbrToken: string;
            fbrMode: FbrMode;
          };
        }
      | {
          action: 'user';
          data: {
            username: string;
            full_name: string;
            password: string;
            role: UserRole;
            branch_id: number | null;
          };
        };

    const db = getDb();
    if (body.action === 'business') {
      const settings = updateBusinessSettings(db, body.data);
      return jsonOk({ settings });
    }
    if (body.action === 'branch_terminal') {
      const res = saveBranchAndTerminal(db, body.data);
      return jsonOk(res);
    }
    if (body.action === 'user') {
      const user = createUser(db, body.data);
      return jsonOk({ user }, 201);
    }
    return jsonError(new Error('Unknown settings action'), 400);
  } catch (err) {
    return jsonError(err, 400);
  }
}

