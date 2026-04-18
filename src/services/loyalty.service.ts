import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import validator from 'validator';
import { LoyaltyModel } from '../models/loyalty.model';
import prisma from '../databases/prisma/client';
import { buildPaginationMeta } from '../utils/pagination.utils';
import {
  CreateLoyaltyProgramData,
  UpdateLoyaltyProgramData,
  CreateLoyaltyTierData,
  UpdateLoyaltyTierData,
  EnrollMemberData,
  EarnPointsData,
  RedeemPointsData,
  AdjustPointsData,
  LoyaltyDashboard,
  CalculateRedemptionResult,
} from '../types/loyalty';

interface PaginationParams {
  skip: number;
  limit: number;
  page: number;
}

export class LoyaltyService {
  // ── Program Management ───────────────────────────────────────
  static async getProgram(tenantId: string) {
    return await LoyaltyModel.findProgramByTenant(tenantId);
  }

  static async getProgramById(loyaltyProgramId: string) {
    if (!loyaltyProgramId) throw new Error('Loyalty program ID is required');
    return await LoyaltyModel.findProgramById(loyaltyProgramId);
  }

  static async createProgram(data: CreateLoyaltyProgramData) {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Program name is required');
    }

    const existing = await LoyaltyModel.findProgramByTenant(data.tenantId);
    if (existing) {
      throw new Error('A loyalty program already exists for this tenant');
    }

    return await LoyaltyModel.createProgram({
      loyaltyProgramId: uuidv4(),
      tenantId: data.tenantId,
      name: validator.escape(data.name.trim()),
      description: data.description ? validator.escape(data.description.trim()) : undefined,
      pointsPerCurrency: data.pointsPerCurrency ?? 1,
      currencyPerPoint: data.currencyPerPoint ?? 0.01,
      minRedeemPoints: data.minRedeemPoints ?? 100,
      pointsExpiryDays: data.pointsExpiryDays ?? null,
      autoEnroll: data.autoEnroll ?? false,
      isActive: true,
      updatedAt: new Date(),
    });
  }

  static async updateProgram(loyaltyProgramId: string, data: UpdateLoyaltyProgramData) {
    if (!loyaltyProgramId) throw new Error('Loyalty program ID is required');

    const sanitized: any = { updatedAt: new Date() };

    if (data.name !== undefined) {
      if (data.name.trim() === '') throw new Error('Program name cannot be empty');
      sanitized.name = validator.escape(data.name.trim());
    }
    if (data.description !== undefined) {
      sanitized.description = data.description ? validator.escape(data.description.trim()) : null;
    }
    if (data.pointsPerCurrency !== undefined) sanitized.pointsPerCurrency = data.pointsPerCurrency;
    if (data.currencyPerPoint !== undefined) sanitized.currencyPerPoint = data.currencyPerPoint;
    if (data.minRedeemPoints !== undefined) sanitized.minRedeemPoints = data.minRedeemPoints;
    if (data.pointsExpiryDays !== undefined) sanitized.pointsExpiryDays = data.pointsExpiryDays;
    if (data.autoEnroll !== undefined) sanitized.autoEnroll = data.autoEnroll;
    if (data.isActive !== undefined) sanitized.isActive = data.isActive;

    return await LoyaltyModel.updateProgram(loyaltyProgramId, sanitized);
  }

  // ── Tier Management ──────────────────────────────────────────
  static async getTiers(loyaltyProgramId: string) {
    if (!loyaltyProgramId) throw new Error('Loyalty program ID is required');
    return await LoyaltyModel.findTiersByProgram(loyaltyProgramId);
  }

  static async createTier(data: CreateLoyaltyTierData) {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Tier name is required');
    }
    if (!data.loyaltyProgramId) {
      throw new Error('Loyalty program ID is required');
    }

    return await LoyaltyModel.createTier({
      loyaltyTierId: uuidv4(),
      loyaltyProgramId: data.loyaltyProgramId,
      tenantId: data.tenantId,
      name: validator.escape(data.name.trim()),
      minPoints: data.minPoints ?? 0,
      pointsMultiplier: data.pointsMultiplier ?? 1.0,
      discountPercentage: data.discountPercentage ?? 0,
      benefits: data.benefits ? validator.escape(data.benefits.trim()) : null,
      sortOrder: data.sortOrder ?? 0,
      updatedAt: new Date(),
    });
  }

  static async updateTier(loyaltyTierId: string, data: UpdateLoyaltyTierData) {
    if (!loyaltyTierId) throw new Error('Loyalty tier ID is required');

    const sanitized: any = { updatedAt: new Date() };

    if (data.name !== undefined) {
      if (data.name.trim() === '') throw new Error('Tier name cannot be empty');
      sanitized.name = validator.escape(data.name.trim());
    }
    if (data.minPoints !== undefined) sanitized.minPoints = data.minPoints;
    if (data.pointsMultiplier !== undefined) sanitized.pointsMultiplier = data.pointsMultiplier;
    if (data.discountPercentage !== undefined) sanitized.discountPercentage = data.discountPercentage;
    if (data.benefits !== undefined) sanitized.benefits = data.benefits ? validator.escape(data.benefits.trim()) : null;
    if (data.sortOrder !== undefined) sanitized.sortOrder = data.sortOrder;

    return await LoyaltyModel.updateTier(loyaltyTierId, sanitized);
  }

  static async deleteTier(loyaltyTierId: string) {
    if (!loyaltyTierId) throw new Error('Loyalty tier ID is required');
    return await LoyaltyModel.deleteTier(loyaltyTierId);
  }

  // ── Member Management ────────────────────────────────────────
  static async enrollMember(data: EnrollMemberData) {
    if (!data.customerId) throw new Error('Customer ID is required');

    // Prevent enrolling the default/walk-in customer
    const customer = await prisma.customer.findUnique({
      where: { customerId: data.customerId },
      select: { isDefault: true },
    });
    if (!customer) throw new Error('Customer not found');
    if (customer.isDefault) throw new Error('The default walk-in customer cannot be enrolled in a loyalty program');

    const program = data.loyaltyProgramId
      ? await LoyaltyModel.findProgramById(data.loyaltyProgramId)
      : await LoyaltyModel.findProgramByTenant(data.tenantId);

    if (!program) throw new Error('No active loyalty program found');
    if (!program.isActive) throw new Error('Loyalty program is not active');

    const existing = await LoyaltyModel.findMemberByCustomer(program.loyaltyProgramId, data.customerId);
    if (existing) throw new Error('Customer is already enrolled in this loyalty program');

    const baseTier = program.tiers?.find((t: any) => t.minPoints === 0) || program.tiers?.[0] || null;
    const membershipNumber = this.generateMembershipNumber();

    return await LoyaltyModel.createMember({
      loyaltyMemberId: uuidv4(),
      loyaltyProgramId: program.loyaltyProgramId,
      customerId: data.customerId,
      loyaltyTierId: baseTier?.loyaltyTierId || null,
      tenantId: data.tenantId,
      membershipNumber,
      availablePoints: 0,
      lifetimePoints: 0,
      redeemedPoints: 0,
      isActive: true,
      enrolledAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static async getMember(loyaltyMemberId: string) {
    if (!loyaltyMemberId) throw new Error('Loyalty member ID is required');
    return await LoyaltyModel.findMemberById(loyaltyMemberId);
  }

  static async getMemberByCustomer(customerId: string, tenantId: string) {
    if (!customerId) throw new Error('Customer ID is required');
    const program = await LoyaltyModel.findProgramByTenant(tenantId);
    if (!program) return null;
    return await LoyaltyModel.findMemberByCustomer(program.loyaltyProgramId, customerId);
  }

  static async listMembers(loyaltyProgramId: string, pagination: PaginationParams) {
    const [members, total] = await Promise.all([
      LoyaltyModel.findMembersByProgram(loyaltyProgramId, pagination.skip, pagination.limit),
      LoyaltyModel.countMembersByProgram(loyaltyProgramId),
    ]);

    return {
      data: members,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  // ── Points Operations ────────────────────────────────────────
  static async earnPoints(data: EarnPointsData) {
    // Skip default/walk-in customer
    const customer = await prisma.customer.findUnique({
      where: { customerId: data.customerId },
      select: { isDefault: true },
    });
    if (!customer || customer.isDefault) return null;

    const program = await LoyaltyModel.findProgramByTenant(data.tenantId);
    if (!program || !program.isActive) return null;

    let member = await LoyaltyModel.findMemberByCustomer(program.loyaltyProgramId, data.customerId);

    if (!member && program.autoEnroll) {
      member = await this.enrollMember({
        customerId: data.customerId,
        loyaltyProgramId: program.loyaltyProgramId,
        tenantId: data.tenantId,
      });
    }

    if (!member || !member.isActive) return null;

    const multiplier = member.tier?.pointsMultiplier ? Number(member.tier.pointsMultiplier) : 1;
    const basePoints = Math.floor(data.saleTotal * Number(program.pointsPerCurrency));
    const points = Math.floor(basePoints * multiplier);

    if (points <= 0) return null;

    const expiresAt = program.pointsExpiryDays
      ? new Date(Date.now() + program.pointsExpiryDays * 24 * 60 * 60 * 1000)
      : null;

    // Atomic transaction: increment balance + create transaction record
    const memberId = member.loyaltyMemberId;
    const result = await prisma.$transaction(async (tx) => {
      const updatedMember = await tx.loyaltyMember.update({
        where: { loyaltyMemberId: memberId },
        data: {
          availablePoints: { increment: points },
          lifetimePoints: { increment: points },
          lastActivityAt: new Date(),
          updatedAt: new Date(),
          version: { increment: 1 },
        },
        include: {
          tier: true,
          program: true,
          customer: { select: { customerId: true, name: true, phone: true, email: true } },
        },
      });

      const transaction = await tx.loyaltyTransaction.create({
        data: {
          loyaltyTransactionId: uuidv4(),
          loyaltyMemberId: memberId,
          tenantId: data.tenantId,
          branchId: data.branchId,
          type: 'EARN',
          points,
          balanceAfter: updatedMember.availablePoints,
          saleId: data.saleId,
          description: `Earned ${points} points from sale`,
          expiresAt,
          createdBy: data.userId,
          updatedAt: new Date(),
        },
      });

      return { member: updatedMember, transaction, pointsEarned: points };
    });

    // Tier upgrade after transaction commits (non-critical)
    await this.evaluateTierUpgrade(memberId, program.loyaltyProgramId, result.member.lifetimePoints);

    return result;
  }

  static async redeemPoints(data: RedeemPointsData) {
    if (data.points <= 0) throw new Error('Points to redeem must be greater than zero');

    const member = await LoyaltyModel.findMemberById(data.loyaltyMemberId);
    if (!member) throw new Error('Loyalty member not found');
    if (!member.isActive) throw new Error('Loyalty membership is not active');

    const program = await LoyaltyModel.findProgramById(member.loyaltyProgramId);
    if (!program || !program.isActive) throw new Error('Loyalty program is not active');

    if (data.points < program.minRedeemPoints) {
      throw new Error(`Minimum ${program.minRedeemPoints} points required for redemption`);
    }
    if (data.points > member.availablePoints) {
      throw new Error(`Insufficient points. Available: ${member.availablePoints}`);
    }

    const monetaryValue = data.points * Number(program.currencyPerPoint);

    // Atomic transaction: conditional decrement prevents double-spend
    return await prisma.$transaction(async (tx) => {
      const updateResult = await tx.loyaltyMember.updateMany({
        where: {
          loyaltyMemberId: data.loyaltyMemberId,
          availablePoints: { gte: data.points },
        },
        data: {
          availablePoints: { decrement: data.points },
          redeemedPoints: { increment: data.points },
          lastActivityAt: new Date(),
          updatedAt: new Date(),
          version: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        throw new Error('Insufficient points. Balance may have changed, please try again.');
      }

      const updatedMember = await tx.loyaltyMember.findUnique({
        where: { loyaltyMemberId: data.loyaltyMemberId },
        include: {
          tier: true,
          program: true,
          customer: { select: { customerId: true, name: true, phone: true, email: true } },
        },
      });

      const transaction = await tx.loyaltyTransaction.create({
        data: {
          loyaltyTransactionId: uuidv4(),
          loyaltyMemberId: data.loyaltyMemberId,
          tenantId: data.tenantId,
          branchId: data.branchId,
          type: 'REDEEM',
          points: -data.points,
          balanceAfter: updatedMember!.availablePoints,
          saleId: data.saleId || null,
          description: data.description || `Redeemed ${data.points} points`,
          createdBy: data.userId,
          updatedAt: new Date(),
        },
      });

      return { member: updatedMember, transaction, monetaryValue };
    });
  }

  static async adjustPoints(data: AdjustPointsData) {
    if (data.points === 0) throw new Error('Adjustment points cannot be zero');
    if (!data.description || data.description.trim() === '') {
      throw new Error('Adjustment description is required');
    }

    // Atomic transaction: prevents race conditions on balance
    return await prisma.$transaction(async (tx) => {
      if (data.points < 0) {
        // Negative adjustment: conditional update prevents negative balance
        const updateResult = await tx.loyaltyMember.updateMany({
          where: {
            loyaltyMemberId: data.loyaltyMemberId,
            availablePoints: { gte: Math.abs(data.points) },
          },
          data: {
            availablePoints: { increment: data.points },
            lastActivityAt: new Date(),
            updatedAt: new Date(),
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          const exists = await tx.loyaltyMember.findUnique({ where: { loyaltyMemberId: data.loyaltyMemberId } });
          if (!exists) throw new Error('Loyalty member not found');
          throw new Error('Adjustment would result in negative balance');
        }
      } else {
        // Positive adjustment: atomic increment
        const exists = await tx.loyaltyMember.findUnique({ where: { loyaltyMemberId: data.loyaltyMemberId } });
        if (!exists) throw new Error('Loyalty member not found');

        await tx.loyaltyMember.update({
          where: { loyaltyMemberId: data.loyaltyMemberId },
          data: {
            availablePoints: { increment: data.points },
            lifetimePoints: { increment: data.points },
            lastActivityAt: new Date(),
            updatedAt: new Date(),
            version: { increment: 1 },
          },
        });
      }

      const updatedMember = await tx.loyaltyMember.findUnique({
        where: { loyaltyMemberId: data.loyaltyMemberId },
        include: {
          tier: true,
          program: true,
          customer: { select: { customerId: true, name: true, phone: true, email: true } },
        },
      });

      const transaction = await tx.loyaltyTransaction.create({
        data: {
          loyaltyTransactionId: uuidv4(),
          loyaltyMemberId: data.loyaltyMemberId,
          tenantId: data.tenantId,
          branchId: data.branchId,
          type: 'ADJUST',
          points: data.points,
          balanceAfter: updatedMember!.availablePoints,
          description: validator.escape(data.description.trim()),
          createdBy: data.userId,
          updatedAt: new Date(),
        },
      });

      return { member: updatedMember, transaction };
    });
  }

  // ── Transaction History ──────────────────────────────────────
  static async getTransactions(loyaltyMemberId: string, pagination: PaginationParams) {
    const [transactions, total] = await Promise.all([
      LoyaltyModel.findTransactionsByMember(loyaltyMemberId, pagination.skip, pagination.limit),
      LoyaltyModel.countTransactionsByMember(loyaltyMemberId),
    ]);

    return {
      data: transactions,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  // ── Member Dashboard ─────────────────────────────────────────
  static async getMemberDashboard(loyaltyMemberId: string): Promise<LoyaltyDashboard | null> {
    const member = await LoyaltyModel.findMemberById(loyaltyMemberId);
    if (!member) return null;

    const program = await LoyaltyModel.findProgramById(member.loyaltyProgramId);
    if (!program) return null;

    const recentTransactions = await LoyaltyModel.findTransactionsByMember(loyaltyMemberId, 0, 10);
    const pointsValue = member.availablePoints * Number(program.currencyPerPoint);

    const tiers = program.tiers || [];
    const currentTierIndex = tiers.findIndex((t: any) => t.loyaltyTierId === member.loyaltyTierId);
    const nextTier =
      currentTierIndex >= 0 && currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;
    const pointsToNextTier = nextTier ? Math.max(0, nextTier.minPoints - member.lifetimePoints) : undefined;

    return {
      member: member as any,
      recentTransactions: recentTransactions,
      pointsValue,
      nextTier,
      pointsToNextTier,
    };
  }

  // ── Internal Helpers ─────────────────────────────────────────
  static async evaluateTierUpgrade(loyaltyMemberId: string, loyaltyProgramId: string, lifetimePoints: number) {
    const tiers = await LoyaltyModel.findTiersByProgram(loyaltyProgramId);
    if (!tiers.length) return;

    const eligibleTiers = tiers.filter((t: any) => lifetimePoints >= t.minPoints);
    const highestTier = eligibleTiers.length > 0 ? eligibleTiers[eligibleTiers.length - 1] : null;

    if (highestTier) {
      await LoyaltyModel.updateMember(loyaltyMemberId, {
        loyaltyTierId: highestTier.loyaltyTierId,
        updatedAt: new Date(),
      });
    }
  }

  static generateMembershipNumber(): string {
    return `LYL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  // ── Sale Void Reversal ────────────────────────────────────────
  static async reversePointsForSale(saleId: string, tenantId: string, branchId: string, userId: string, txClient?: any) {
    const client = txClient || prisma;

    const saleTransactions = await client.loyaltyTransaction.findMany({
      where: { saleId, deletedAt: null },
    });

    if (!saleTransactions.length) return null;

    const reversals = [];

    for (const txn of saleTransactions) {
      const reversePoints = -txn.points; // EARN(+X) → -X, REDEEM(-X) → +X
      if (reversePoints === 0) continue;

      if (reversePoints > 0) {
        // Reversing a REDEEM: restore points to customer
        await client.loyaltyMember.update({
          where: { loyaltyMemberId: txn.loyaltyMemberId },
          data: {
            availablePoints: { increment: reversePoints },
            redeemedPoints: { decrement: Math.abs(txn.points) },
            lastActivityAt: new Date(),
            updatedAt: new Date(),
            version: { increment: 1 },
          },
        });
      } else {
        // Reversing an EARN: deduct points, clamp to zero
        const absDeduct = Math.abs(reversePoints);
        const member = await client.loyaltyMember.findUnique({
          where: { loyaltyMemberId: txn.loyaltyMemberId },
        });
        if (!member) continue;

        const deductAmount = Math.min(absDeduct, member.availablePoints);
        await client.loyaltyMember.update({
          where: { loyaltyMemberId: txn.loyaltyMemberId },
          data: {
            availablePoints: { decrement: deductAmount },
            lifetimePoints: { decrement: absDeduct },
            lastActivityAt: new Date(),
            updatedAt: new Date(),
            version: { increment: 1 },
          },
        });
      }

      // Get updated balance for transaction record
      const updatedMember = await client.loyaltyMember.findUnique({
        where: { loyaltyMemberId: txn.loyaltyMemberId },
      });

      const reversal = await client.loyaltyTransaction.create({
        data: {
          loyaltyTransactionId: uuidv4(),
          loyaltyMemberId: txn.loyaltyMemberId,
          tenantId,
          branchId,
          type: 'ADJUST',
          points: reversePoints,
          balanceAfter: updatedMember?.availablePoints || 0,
          saleId,
          description: `Reversed ${txn.type} of ${Math.abs(txn.points)} points (sale voided)`,
          createdBy: userId,
          updatedAt: new Date(),
        },
      });
      reversals.push(reversal);
    }

    return reversals;
  }

  // ── Redemption Preview ────────────────────────────────────────
  static async calculateRedemption(loyaltyMemberId: string, points: number): Promise<CalculateRedemptionResult> {
    const member = await LoyaltyModel.findMemberById(loyaltyMemberId);
    if (!member) throw new Error('Loyalty member not found');
    if (!member.isActive) throw new Error('Loyalty membership is not active');

    const program = await LoyaltyModel.findProgramById(member.loyaltyProgramId);
    if (!program || !program.isActive) throw new Error('Loyalty program is not active');

    const monetaryValue = points * Number(program.currencyPerPoint);
    const canRedeem = points >= program.minRedeemPoints && points <= member.availablePoints;

    return {
      points,
      monetaryValue,
      canRedeem,
      availablePoints: member.availablePoints,
      minRedeemPoints: program.minRedeemPoints,
      currencyPerPoint: Number(program.currencyPerPoint),
      balanceAfterRedeem: canRedeem ? member.availablePoints - points : member.availablePoints,
    };
  }
}
