import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { LoyaltyService } from '../services/loyalty.service';
import { parsePaginationParams } from '../utils/pagination.utils';
import { AuditService, getAuditContext } from '../services/audit.service';

export class LoyaltyController extends BaseController {
  // ── Program ──────────────────────────────────────────────────
  static async getProgram(req: Request, res: Response) {
    try {
      const auth = (req as any).auth;
      const tenantId = auth?.tenantId;

      const program = await LoyaltyService.getProgram(tenantId);

      BaseController.sendSuccess(
        res,
        program ? 'Loyalty program retrieved successfully' : 'No loyalty program configured',
        program || null
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      BaseController.sendServerError(res, 'Failed to retrieve loyalty program', msg);
    }
  }

  static async createProgram(req: Request, res: Response) {
    try {
      const auth = (req as any).auth;
      const tenantId = auth?.tenantId;

      const program = await LoyaltyService.createProgram({
        ...req.body,
        tenantId,
      });

      AuditService.logCreate(getAuditContext(req), 'LoyaltyProgram', program.loyaltyProgramId, req.body.name, req.body);

      BaseController.sendCreated(res, 'Loyalty program created successfully', program);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (msg.includes('already exists') || msg.includes('required') || msg.includes('empty')) {
        BaseController.sendBadRequest(res, msg);
      } else {
        BaseController.sendServerError(res, 'Failed to create loyalty program', msg);
      }
    }
  }

  static async updateProgram(req: Request, res: Response) {
    try {
      const programId = req.params.programId as string;
      if (!programId) return BaseController.sendBadRequest(res, 'Program ID is required');

      const program = await LoyaltyService.updateProgram(programId, req.body);

      AuditService.logUpdate(getAuditContext(req), 'LoyaltyProgram', programId, programId, undefined, req.body);

      BaseController.sendSuccess(res, 'Loyalty program updated successfully', program);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (msg.includes('required') || msg.includes('empty')) {
        BaseController.sendBadRequest(res, msg);
      } else {
        BaseController.sendServerError(res, 'Failed to update loyalty program', msg);
      }
    }
  }

  // ── Tiers ────────────────────────────────────────────────────
  static async getTiers(req: Request, res: Response) {
    try {
      const programId = req.params.programId as string;
      if (!programId) return BaseController.sendBadRequest(res, 'Program ID is required');

      const tiers = await LoyaltyService.getTiers(programId);

      BaseController.sendSuccess(res, 'Loyalty tiers retrieved successfully', tiers);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      BaseController.sendServerError(res, 'Failed to retrieve loyalty tiers', msg);
    }
  }

  static async createTier(req: Request, res: Response) {
    try {
      const auth = (req as any).auth;
      const tenantId = auth?.tenantId;
      const programId = req.params.programId as string;

      const tier = await LoyaltyService.createTier({
        ...req.body,
        loyaltyProgramId: programId,
        tenantId,
      });

      AuditService.logCreate(getAuditContext(req), 'LoyaltyTier', tier.loyaltyTierId, req.body.name, req.body);

      BaseController.sendCreated(res, 'Loyalty tier created successfully', tier);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (msg.includes('required') || msg.includes('empty')) {
        BaseController.sendBadRequest(res, msg);
      } else {
        BaseController.sendServerError(res, 'Failed to create loyalty tier', msg);
      }
    }
  }

  static async updateTier(req: Request, res: Response) {
    try {
      const tierId = req.params.tierId as string;
      if (!tierId) return BaseController.sendBadRequest(res, 'Tier ID is required');

      const tier = await LoyaltyService.updateTier(tierId, req.body);

      AuditService.logUpdate(getAuditContext(req), 'LoyaltyTier', tierId, tierId, undefined, req.body);

      BaseController.sendSuccess(res, 'Loyalty tier updated successfully', tier);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (msg.includes('required') || msg.includes('empty')) {
        BaseController.sendBadRequest(res, msg);
      } else {
        BaseController.sendServerError(res, 'Failed to update loyalty tier', msg);
      }
    }
  }

  static async deleteTier(req: Request, res: Response) {
    try {
      const tierId = req.params.tierId as string;
      if (!tierId) return BaseController.sendBadRequest(res, 'Tier ID is required');

      await LoyaltyService.deleteTier(tierId);

      AuditService.logDelete(getAuditContext(req), 'LoyaltyTier', tierId, tierId);

      BaseController.sendSuccess(res, 'Loyalty tier deleted successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      BaseController.sendServerError(res, 'Failed to delete loyalty tier', msg);
    }
  }

  // ── Members ──────────────────────────────────────────────────
  static async enrollMember(req: Request, res: Response) {
    try {
      const auth = (req as any).auth;
      const tenantId = auth?.tenantId;
      const { customerId } = req.body;

      if (!customerId) return BaseController.sendBadRequest(res, 'Customer ID is required');

      const member = await LoyaltyService.enrollMember({
        customerId,
        loyaltyProgramId: req.body.loyaltyProgramId,
        tenantId,
      });

      AuditService.logCreate(getAuditContext(req), 'LoyaltyMember', member.loyaltyMemberId, customerId, req.body);

      BaseController.sendCreated(res, 'Customer enrolled in loyalty program successfully', member);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (
        msg.includes('already enrolled') ||
        msg.includes('required') ||
        msg.includes('not found') ||
        msg.includes('not active')
      ) {
        BaseController.sendBadRequest(res, msg);
      } else {
        BaseController.sendServerError(res, 'Failed to enroll customer', msg);
      }
    }
  }

  static async getMember(req: Request, res: Response) {
    try {
      const memberId = req.params.memberId as string;
      if (!memberId) return BaseController.sendBadRequest(res, 'Member ID is required');

      const member = await LoyaltyService.getMember(memberId);
      if (!member) return BaseController.sendNotFound(res, 'Loyalty member not found');

      BaseController.sendSuccess(res, 'Loyalty member retrieved successfully', member);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      BaseController.sendServerError(res, 'Failed to retrieve loyalty member', msg);
    }
  }

  static async getMemberByCustomer(req: Request, res: Response) {
    try {
      const auth = (req as any).auth;
      const tenantId = auth?.tenantId;
      const customerId = req.params.customerId as string;

      if (!customerId) return BaseController.sendBadRequest(res, 'Customer ID is required');

      const member = await LoyaltyService.getMemberByCustomer(customerId, tenantId);
      if (!member) return BaseController.sendNotFound(res, 'Customer is not enrolled in any loyalty program');

      BaseController.sendSuccess(res, 'Loyalty member retrieved successfully', member);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      BaseController.sendServerError(res, 'Failed to retrieve loyalty member', msg);
    }
  }

  static async listMembers(req: Request, res: Response) {
    try {
      const programId = req.params.programId as string;
      if (!programId) return BaseController.sendBadRequest(res, 'Program ID is required');

      const pagination = parsePaginationParams(req.query);
      const result = await LoyaltyService.listMembers(programId, pagination);

      BaseController.sendPaginated(res, 'Loyalty members retrieved successfully', result.data, result.pagination, 'members');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      BaseController.sendServerError(res, 'Failed to retrieve loyalty members', msg);
    }
  }

  // ── Points Operations ────────────────────────────────────────
  static async redeemPoints(req: Request, res: Response) {
    try {
      const auth = (req as any).auth;
      const tenantId = auth?.tenantId;
      const branchId = auth?.activeBranchId || auth?.currentBranchId || auth?.branchId;
      const userId = auth?.userId;
      const memberId = req.params.memberId as string;

      const { points, saleId, description } = req.body;

      if (!memberId) return BaseController.sendBadRequest(res, 'Member ID is required');
      if (!points || points <= 0) return BaseController.sendBadRequest(res, 'Points must be greater than zero');

      const result = await LoyaltyService.redeemPoints({
        loyaltyMemberId: memberId,
        points,
        saleId,
        description,
        tenantId,
        branchId,
        userId,
      });

      AuditService.logCreate(getAuditContext(req), 'LoyaltyRedemption', memberId, `${points} points`, req.body);

      BaseController.sendSuccess(res, 'Points redeemed successfully', result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (
        msg.includes('Insufficient') ||
        msg.includes('Minimum') ||
        msg.includes('not found') ||
        msg.includes('not active')
      ) {
        BaseController.sendBadRequest(res, msg);
      } else {
        BaseController.sendServerError(res, 'Failed to redeem points', msg);
      }
    }
  }

  static async adjustPoints(req: Request, res: Response) {
    try {
      const auth = (req as any).auth;
      const tenantId = auth?.tenantId;
      const branchId = auth?.activeBranchId || auth?.currentBranchId || auth?.branchId;
      const userId = auth?.userId;
      const memberId = req.params.memberId as string;

      const { points, description } = req.body;

      if (!memberId) return BaseController.sendBadRequest(res, 'Member ID is required');
      if (points === undefined || points === 0)
        return BaseController.sendBadRequest(res, 'Points adjustment cannot be zero');
      if (!description) return BaseController.sendBadRequest(res, 'Description is required for adjustments');

      const result = await LoyaltyService.adjustPoints({
        loyaltyMemberId: memberId,
        points,
        description,
        tenantId,
        branchId,
        userId,
      });

      AuditService.logUpdate(getAuditContext(req), 'LoyaltyAdjustment', memberId, `${points} points`, undefined, req.body);

      BaseController.sendSuccess(res, 'Points adjusted successfully', result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (
        msg.includes('negative') ||
        msg.includes('zero') ||
        msg.includes('required') ||
        msg.includes('not found')
      ) {
        BaseController.sendBadRequest(res, msg);
      } else {
        BaseController.sendServerError(res, 'Failed to adjust points', msg);
      }
    }
  }

  // ── Transactions & Dashboard ─────────────────────────────────
  static async getTransactions(req: Request, res: Response) {
    try {
      const memberId = req.params.memberId as string;
      if (!memberId) return BaseController.sendBadRequest(res, 'Member ID is required');

      const pagination = parsePaginationParams(req.query);
      const result = await LoyaltyService.getTransactions(memberId, pagination);

      BaseController.sendPaginated(
        res,
        'Loyalty transactions retrieved successfully',
        result.data,
        result.pagination,
        'transactions'
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      BaseController.sendServerError(res, 'Failed to retrieve loyalty transactions', msg);
    }
  }

  static async getMemberDashboard(req: Request, res: Response) {
    try {
      const memberId = req.params.memberId as string;
      if (!memberId) return BaseController.sendBadRequest(res, 'Member ID is required');

      const dashboard = await LoyaltyService.getMemberDashboard(memberId);
      if (!dashboard) return BaseController.sendNotFound(res, 'Loyalty member not found');

      BaseController.sendSuccess(res, 'Loyalty dashboard retrieved successfully', dashboard);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      BaseController.sendServerError(res, 'Failed to retrieve loyalty dashboard', msg);
    }
  }

  static async calculateRedemption(req: Request, res: Response) {
    try {
      const memberId = req.params.memberId as string;
      if (!memberId) return BaseController.sendBadRequest(res, 'Member ID is required');

      const points = Number(req.query.points);
      if (!points || points <= 0)
        return BaseController.sendBadRequest(res, 'Points query parameter must be greater than zero');

      const result = await LoyaltyService.calculateRedemption(memberId, points);

      BaseController.sendSuccess(res, 'Redemption preview calculated', result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (msg.includes('not found') || msg.includes('not active')) {
        BaseController.sendBadRequest(res, msg);
      } else {
        BaseController.sendServerError(res, 'Failed to calculate redemption', msg);
      }
    }
  }
}
