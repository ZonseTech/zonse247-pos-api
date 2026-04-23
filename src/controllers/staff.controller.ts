import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { StaffService } from '../services/staff.service';
import { parsePaginationParams } from '../utils/pagination.utils';
import { EmploymentStatus } from '../types/staff';

export class StaffController extends BaseController {
  static getAuth(req: Request) {
    const auth = (req as any).auth;
    return {
      tenantId: auth.tenantId,
      branchId: auth.activeBranchId || auth.branchId,
    };
  }

  // ── Create ────────────────────────────────────────────────
  static async createStaff(req: Request, res: Response) {
    try {
      const { tenantId, branchId } = StaffController.getAuth(req);
      const staff = await StaffService.createStaff(req.body, tenantId, branchId);

      BaseController.sendResponse(res, 201, true, 'Staff created successfully', staff);
    } catch (error) {
      const msg = (error as Error).message;
      const status = msg.includes('already has') ? 409 : msg.includes('not found') ? 404 : 400;
      BaseController.sendResponse(res, status, false, 'Failed to create staff', undefined, msg);
    }
  }

  // ── List ──────────────────────────────────────────────────
  static async listStaff(req: Request, res: Response) {
    try {
      const { tenantId, branchId } = StaffController.getAuth(req);
      const pagination = parsePaginationParams(req.query);
      const { search, department, employmentStatus } = req.query;

      const result = await StaffService.listStaff(
        tenantId,
        branchId,
        {
          search: search as string | undefined,
          department: department as string | undefined,
          employmentStatus: employmentStatus as EmploymentStatus | undefined,
        },
        pagination
      );

      BaseController.sendPaginated(res, 'Staff fetched successfully', result.data, result.pagination, 'staff');
    } catch (error) {
      BaseController.sendResponse(res, 500, false, 'Failed to list staff', undefined, (error as Error).message);
    }
  }

  // ── Get by ID ─────────────────────────────────────────────
  static async getStaff(req: Request, res: Response) {
    try {
      const { tenantId, branchId } = StaffController.getAuth(req);
      const staffId = req.params.staffId as string;

      const staff = await StaffService.getStaffById(staffId, tenantId, branchId);

      if (!staff) {
        BaseController.sendResponse(res, 404, false, 'Staff not found');
        return;
      }

      BaseController.sendResponse(res, 200, true, 'Staff retrieved successfully', staff);
    } catch (error) {
      BaseController.sendResponse(res, 400, false, 'Failed to get staff', undefined, (error as Error).message);
    }
  }

  // ── Update ────────────────────────────────────────────────
  static async updateStaff(req: Request, res: Response) {
    try {
      const { tenantId, branchId } = StaffController.getAuth(req);
      const staffId = req.params.staffId as string;

      const staff = await StaffService.updateStaff(staffId, tenantId, branchId, req.body);

      BaseController.sendResponse(res, 200, true, 'Staff updated successfully', staff);
    } catch (error) {
      const status = (error as Error).message === 'Staff not found' ? 404 : 400;
      BaseController.sendResponse(res, status, false, 'Failed to update staff', undefined, (error as Error).message);
    }
  }

  // ── Delete ────────────────────────────────────────────────
  static async deleteStaff(req: Request, res: Response) {
    try {
      const { tenantId, branchId } = StaffController.getAuth(req);
      const staffId = req.params.staffId as string;

      await StaffService.deleteStaff(staffId, tenantId, branchId);

      BaseController.sendResponse(res, 200, true, 'Staff deleted successfully');
    } catch (error) {
      const status = (error as Error).message === 'Staff not found' ? 404 : 400;
      BaseController.sendResponse(res, status, false, 'Failed to delete staff', undefined, (error as Error).message);
    }
  }
}
