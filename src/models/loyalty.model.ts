import prisma from '../databases/prisma/client';

export class LoyaltyModel {
  // ── Program ──────────────────────────────────────────────────
  static async findProgramByTenant(tenantId: string) {
    try {
      return await prisma.loyaltyProgram.findFirst({
        where: { tenantId, deletedAt: null },
        include: { tiers: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } },
      });
    } catch (error) {
      throw new Error(`Error finding loyalty program: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async findProgramById(loyaltyProgramId: string) {
    try {
      return await prisma.loyaltyProgram.findUnique({
        where: { loyaltyProgramId },
        include: { tiers: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } },
      });
    } catch (error) {
      throw new Error(`Error finding loyalty program: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async createProgram(data: any) {
    try {
      return await prisma.loyaltyProgram.create({ data });
    } catch (error) {
      throw new Error(`Error creating loyalty program: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async updateProgram(loyaltyProgramId: string, data: any) {
    try {
      return await prisma.loyaltyProgram.update({ where: { loyaltyProgramId }, data });
    } catch (error) {
      throw new Error(`Error updating loyalty program: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ── Tiers ────────────────────────────────────────────────────
  static async findTiersByProgram(loyaltyProgramId: string) {
    try {
      return await prisma.loyaltyTier.findMany({
        where: { loyaltyProgramId, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      });
    } catch (error) {
      throw new Error(`Error finding loyalty tiers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async findTierById(loyaltyTierId: string) {
    try {
      return await prisma.loyaltyTier.findUnique({ where: { loyaltyTierId } });
    } catch (error) {
      throw new Error(`Error finding loyalty tier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async createTier(data: any) {
    try {
      return await prisma.loyaltyTier.create({ data });
    } catch (error) {
      throw new Error(`Error creating loyalty tier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async updateTier(loyaltyTierId: string, data: any) {
    try {
      return await prisma.loyaltyTier.update({ where: { loyaltyTierId }, data });
    } catch (error) {
      throw new Error(`Error updating loyalty tier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async deleteTier(loyaltyTierId: string) {
    try {
      return await prisma.loyaltyTier.update({
        where: { loyaltyTierId },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      throw new Error(`Error deleting loyalty tier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ── Members ──────────────────────────────────────────────────
  static async findMemberByCustomer(loyaltyProgramId: string, customerId: string) {
    try {
      return await prisma.loyaltyMember.findFirst({
        where: { loyaltyProgramId, customerId, deletedAt: null },
        include: {
          tier: true,
          program: true,
          customer: { select: { customerId: true, name: true, phone: true, email: true } },
        },
      });
    } catch (error) {
      throw new Error(`Error finding loyalty member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async findMemberById(loyaltyMemberId: string) {
    try {
      return await prisma.loyaltyMember.findUnique({
        where: { loyaltyMemberId },
        include: {
          tier: true,
          program: true,
          customer: { select: { customerId: true, name: true, phone: true, email: true } },
        },
      });
    } catch (error) {
      throw new Error(`Error finding loyalty member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async findMembersByProgram(loyaltyProgramId: string, skip: number, take: number) {
    try {
      return await prisma.loyaltyMember.findMany({
        where: { loyaltyProgramId, deletedAt: null },
        include: {
          tier: true,
          customer: { select: { customerId: true, name: true, phone: true, email: true } },
        },
        skip,
        take,
        orderBy: { lifetimePoints: 'desc' },
      });
    } catch (error) {
      throw new Error(`Error finding loyalty members: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async countMembersByProgram(loyaltyProgramId: string) {
    try {
      return await prisma.loyaltyMember.count({
        where: { loyaltyProgramId, deletedAt: null },
      });
    } catch (error) {
      throw new Error(`Error counting loyalty members: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async createMember(data: any) {
    try {
      return await prisma.loyaltyMember.create({
        data,
        include: {
          tier: true,
          program: true,
          customer: { select: { customerId: true, name: true, phone: true, email: true } },
        },
      });
    } catch (error) {
      throw new Error(`Error creating loyalty member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async updateMember(loyaltyMemberId: string, data: any) {
    try {
      return await prisma.loyaltyMember.update({
        where: { loyaltyMemberId },
        data,
        include: {
          tier: true,
          program: true,
          customer: { select: { customerId: true, name: true, phone: true, email: true } },
        },
      });
    } catch (error) {
      throw new Error(`Error updating loyalty member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ── Transactions ─────────────────────────────────────────────
  static async createTransaction(data: any) {
    try {
      return await prisma.loyaltyTransaction.create({ data });
    } catch (error) {
      throw new Error(`Error creating loyalty transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async findTransactionsByMember(loyaltyMemberId: string, skip: number, take: number) {
    try {
      return await prisma.loyaltyTransaction.findMany({
        where: { loyaltyMemberId, deletedAt: null },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new Error(`Error finding loyalty transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async countTransactionsByMember(loyaltyMemberId: string) {
    try {
      return await prisma.loyaltyTransaction.count({
        where: { loyaltyMemberId, deletedAt: null },
      });
    } catch (error) {
      throw new Error(`Error counting loyalty transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async findExpiredPointTransactions(beforeDate: Date) {
    try {
      return await prisma.loyaltyTransaction.findMany({
        where: {
          type: 'EARN',
          expiresAt: { lte: beforeDate },
          deletedAt: null,
        },
        include: { member: true },
      });
    } catch (error) {
      throw new Error(`Error finding expired transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
