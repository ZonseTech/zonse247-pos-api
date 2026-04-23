import { ConsumptionInput, ServiceItemStatus } from '../../types/service-order.types';

// ─── Order Number ───────────────────────────────────────────────────
export const ORDER_NUMBER_PREFIX = 'SO';

// ─── Prisma Select Objects ──────────────────────────────────────────
export const SERVICE_SELECT = {
  id: true,
  name: true,
  sku: true,
  pricingType: true,
  basePrice: true,
  durationMinutes: true,
} as const;

export const USER_SELECT = {
  userId: true,
  fullname: true,
} as const;

export const CUSTOMER_SELECT = {
  customerId: true,
  name: true,
  phone: true,
  email: true,
} as const;

export const STAFF_SELECT = {
  staffId: true,
  userId: true,
  employeeCode: true,
  user: { select: { fullname: true } },
} as const;

export const VARIANT_SELECT = {
  id: true,
  variantName: true,
  sku: true,
  primaryBarcode: true,
  sellingPrice: true,
  product: { select: { id: true, name: true } },
} as const;

// ─── Prisma Include for full order fetch ────────────────────────────
export const ORDER_INCLUDE = {
  serviceOrderItems: {
    where: { deletedAt: null },
    include: {
      service: { select: SERVICE_SELECT },
      consumptions: { where: { deletedAt: null } },
      staffAssignments: {
        where: { deletedAt: null },
        include: { staff: { select: STAFF_SELECT } },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  productItems: {
    where: { deletedAt: null },
    include: { variant: { select: VARIANT_SELECT } },
    orderBy: { createdAt: 'asc' as const },
  },
  payments: { where: { deletedAt: null }, include: { paymentMethod: true } },
  customer: { select: CUSTOMER_SELECT },
  createdByUser: { select: USER_SELECT },
  appointments: true,
};

// ─── Internal Types ─────────────────────────────────────────────────
export interface ProcessedProductItem {
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  inventoryId: string;
}

export interface ServiceOrderItemData {
  id: string;
  tenantId: string;
  branchId: string;
  terminalId?: string | null;
  serviceId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  subtotal: number;
  taxAmount: number;
  totalPrice: number;
  status: ServiceItemStatus;
  notes?: string | null;
  consumptions?: ConsumptionInput[];
  staffAssignments?: any[];
}
