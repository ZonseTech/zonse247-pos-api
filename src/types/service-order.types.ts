/**
 * Service Order Types
 *
 * TypeScript interfaces for the service-order lifecycle:
 * PENDING → IN_PROGRESS → COMPLETED (or CANCELLED)
 */

export type ServiceOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PARTIALLY_PAID' | 'PAID';
export type ServiceItemStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type CommissionType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type ServiceOrderType = 'SERVICE_ONLY' | 'PRODUCT_ONLY' | 'HYBRID';

export interface CreateServiceOrderInput {
  customerId?: string;
  terminalId?: string;
  notes?: string;
  items?: CreateServiceOrderItemInput[];
  productItems?: CreateServiceOrderProductItemInput[];
}

export interface CreateServiceOrderItemInput {
  serviceId: string;
  quantity?: number;
  unitPrice: number;
  discountAmount?: number;
  taxAmount?: number;
  notes?: string;
  consumptions?: ConsumptionInput[];
  staffAssignments?: StaffAssignmentInput[];
}

export interface ConsumptionInput {
  productVariantId: string;
  quantity: number;
}

export interface StaffAssignmentInput {
  staffId: string;
  role?: string;
  commissionType?: CommissionType;
  commissionValue?: number;
}

export interface CreateServiceOrderProductItemInput {
  variantId: string;
  productId?: string;
  quantity: number;
  unitPrice: number;
  taxAmount?: number;
  discountAmount?: number;
}

export interface UpdateServiceOrderInput {
  customerId?: string;
  notes?: string;
  discountAmount?: number;
  items?: CreateServiceOrderItemInput[];
  productItems?: CreateServiceOrderProductItemInput[];
}

export interface CompleteItemInput {
  consumptions?: ConsumptionInput[];
}

export interface ServiceOrderPaymentInput {
  paymentMethodId: string;
  amount: number;
  reference?: string;
  providerId?: string;
  providerRef?: string;
  notes?: string;
}

export interface ListServiceOrdersOptions {
  status?: ServiceOrderStatus;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}

export interface ServiceOrderWithItems {
  id: string;
  tenantId: string;
  branchId: string;
  terminalId?: string | null;
  customerId?: string | null;
  orderNumber: string;
  orderType: ServiceOrderType;
  status: ServiceOrderStatus;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: ServiceOrderItemDetail[];
  productItems: ServiceOrderProductItemDetail[];
  payments?: any[];
  customer?: any;
  appointment?: any;
}

export interface ServiceOrderItemDetail {
  id: string;
  serviceOrderId: string;
  serviceId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  subtotal: number;
  taxAmount: number;
  totalPrice: number;
  status: ServiceItemStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  notes?: string | null;
  service?: any;
  consumptions?: any[];
  staffAssignments?: any[];
}

export interface ServiceOrderProductItemDetail {
  id: string;
  serviceOrderId: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  variant?: any;
}
