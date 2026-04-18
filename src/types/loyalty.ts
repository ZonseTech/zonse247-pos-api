export type LoyaltyTransactionType = 'EARN' | 'REDEEM' | 'ADJUST' | 'EXPIRE';

export interface LoyaltyProgram {
  loyaltyProgramId: string;
  tenantId: string;
  name: string;
  description?: string | null;
  pointsPerCurrency: number;
  currencyPerPoint: number;
  minRedeemPoints: number;
  pointsExpiryDays?: number | null;
  autoEnroll: boolean;
  isActive: boolean;
  version: number;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateLoyaltyProgramData {
  name: string;
  description?: string;
  pointsPerCurrency?: number;
  currencyPerPoint?: number;
  minRedeemPoints?: number;
  pointsExpiryDays?: number;
  autoEnroll?: boolean;
  tenantId: string;
}

export interface UpdateLoyaltyProgramData {
  name?: string;
  description?: string;
  pointsPerCurrency?: number;
  currencyPerPoint?: number;
  minRedeemPoints?: number;
  pointsExpiryDays?: number | null;
  autoEnroll?: boolean;
  isActive?: boolean;
}

export interface LoyaltyTier {
  loyaltyTierId: string;
  loyaltyProgramId: string;
  tenantId: string;
  name: string;
  minPoints: number;
  pointsMultiplier: number;
  discountPercentage: number;
  benefits?: string | null;
  sortOrder: number;
  version: number;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateLoyaltyTierData {
  loyaltyProgramId: string;
  name: string;
  minPoints: number;
  pointsMultiplier?: number;
  discountPercentage?: number;
  benefits?: string;
  sortOrder?: number;
  tenantId: string;
}

export interface UpdateLoyaltyTierData {
  name?: string;
  minPoints?: number;
  pointsMultiplier?: number;
  discountPercentage?: number;
  benefits?: string | null;
  sortOrder?: number;
}

export interface LoyaltyMember {
  loyaltyMemberId: string;
  loyaltyProgramId: string;
  customerId: string;
  loyaltyTierId?: string | null;
  tenantId: string;
  membershipNumber: string;
  availablePoints: number;
  lifetimePoints: number;
  redeemedPoints: number;
  isActive: boolean;
  enrolledAt: Date;
  lastActivityAt?: Date | null;
  version: number;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EnrollMemberData {
  customerId: string;
  loyaltyProgramId?: string;
  tenantId: string;
}

export interface LoyaltyTransaction {
  loyaltyTransactionId: string;
  loyaltyMemberId: string;
  tenantId: string;
  branchId: string;
  type: LoyaltyTransactionType;
  points: number;
  balanceAfter: number;
  saleId?: string | null;
  description?: string | null;
  expiresAt?: Date | null;
  createdBy?: string | null;
  version: number;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EarnPointsData {
  customerId: string;
  saleId: string;
  saleTotal: number;
  tenantId: string;
  branchId: string;
  userId: string;
}

export interface RedeemPointsData {
  loyaltyMemberId: string;
  points: number;
  saleId?: string;
  description?: string;
  tenantId: string;
  branchId: string;
  userId: string;
}

export interface AdjustPointsData {
  loyaltyMemberId: string;
  points: number;
  description: string;
  tenantId: string;
  branchId: string;
  userId: string;
}

export interface LoyaltyMemberWithDetails extends LoyaltyMember {
  customer?: {
    customerId: string;
    name: string;
    phone?: string;
    email?: string;
  };
  tier?: LoyaltyTier | null;
  program?: LoyaltyProgram;
}

export interface LoyaltyDashboard {
  member: LoyaltyMemberWithDetails;
  recentTransactions: LoyaltyTransaction[];
  pointsValue: number;
  nextTier?: LoyaltyTier | null;
  pointsToNextTier?: number;
}

export interface CalculateRedemptionResult {
  points: number;
  monetaryValue: number;
  canRedeem: boolean;
  availablePoints: number;
  minRedeemPoints: number;
  currencyPerPoint: number;
  balanceAfterRedeem: number;
}
