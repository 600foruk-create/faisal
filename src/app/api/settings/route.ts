import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '../../../lib/api-utils.ts';
import { getDb } from '../../../lib/db.ts';
import {
  clearAllTransactions,
  createUser,
  deleteCompanyTenant,
  exportSystemBackup,
  getBranchesWithTerminals,
  getBusinessSettings,
  getCompanies,
  getUsers,
  saveBranchAndTerminal,
  saveCompanyTenant,
  saveUserRights,
  systemFactoryReset,
  updateBusinessSettings,
  updateUser,
} from '../../../lib/pos-service.ts';
import type { BusinessSettings, CompanyTenant, FbrMode, UserRole } from '../../../lib/types.ts';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    if (req.nextUrl.searchParams.get('backup') === '1') {
      return jsonOk(exportSystemBackup(db));
    }
    const { branches, terminals } = getBranchesWithTerminals(db);
    const settings = getBusinessSettings(db);
    const users = getUsers(db);
    const companies = getCompanies(db);
    return jsonOk({ settings, branches, terminals, users, companies });
  } catch (err) {
    return jsonError(err, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as
      | { action: 'business'; data: Partial<BusinessSettings> }
      | { action: 'company'; data: Parameters<typeof saveCompanyTenant>[1] }
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
            requestingRole?: string;
            requestingUser?: string;
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
            company_code?: string;
          };
        }
      | {
          action: 'user_update';
          data: {
            id: number;
            full_name: string;
            role: UserRole;
            branch_id: number | null;
            company_code?: string;
            is_active: number;
            password?: string;
          };
        }
      | { action: 'save_user_rights'; data: { user_id: number; permissions: Record<string, boolean> } }
      | { action: 'delete_company'; data: { id?: number; code?: string; company_code?: string; requestingRole?: string; requestingUser?: string } }
      | { action: 'clear_transactions'; data?: { confirm?: string } };

    const db = getDb();
    if (body.action === 'business') {
      const settings = updateBusinessSettings(db, body.data);
      return jsonOk({ settings });
    }
    if (body.action === 'company') {
      const company = saveCompanyTenant(db, body.data);
      return jsonOk({ company, companies: getCompanies(db) });
    }
    if (body.action === 'delete_company') {
      const id = body.data?.id !== undefined && body.data?.id !== null ? Number(body.data.id) : null;
      const code = body.data?.code || body.data?.company_code;
      const res = deleteCompanyTenant(
        db,
        id,
        code,
        body.data?.requestingRole,
        body.data?.requestingUser
      );
      return jsonOk(res);
    }
    if (body.action === 'branch_terminal') {
      if (!body.data.branchId) {
        const reqRole = (body.data.requestingRole || '').toUpperCase();
        const reqUser = (body.data.requestingUser || '').toLowerCase();
        if (reqRole && reqRole !== 'SUPER_ADMIN' && reqUser !== 'faisal') {
          return jsonError(new Error('Unauthorized: Only Platform Super Admin (Faisal) is authorized to provision new branches'), 403);
        }
      }
      const res = saveBranchAndTerminal(db, body.data);
      return jsonOk(res);
    }
    if (body.action === 'user') {
      const user = createUser(db, body.data);
      return jsonOk({ user }, 201);
    }
    if (body.action === 'user_update') {
      const user = updateUser(db, body.data);
      return jsonOk({ user });
    }
    if (body.action === 'save_user_rights') {
      const res = saveUserRights(db, Number(body.data?.user_id), body.data?.permissions ?? {});
      return jsonOk(res);
    }
    if (body.action === 'clear_transactions' || (body as { action: string }).action === 'factory_reset') {
      return jsonOk(systemFactoryReset(db));
    }
    return jsonError(new Error('Unknown settings action'), 400);
  } catch (err) {
    return jsonError(err, 400);
  }
}
