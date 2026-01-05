import { Customer } from "customer";
import { CartItem } from "order";
import { PaymentMethod } from "payment-method";
import { PaymentServiceProvider } from "payment-service-provider";
import { Terminal } from "terminal";
import { Decimal } from "../databases/prisma/generated/prisma/internal/prismaNamespace";
import { User } from "users";

export type Transaction = {
    refNumber?: string;
    subtotal: Decimal;
    tax: Decimal;
    date: Date;
    userId: string;
    tenantId?: string;
    branchId?: string;
    customerId?: string;
    paymentServiceProviderId?: string;
    transactionId?: string;
    externalTransactionRef?: string; // External payment reference (e.g., from Airtel Money, bank transfer)
    paymentMethodId?: string;
    terminalId: string;
    phoneNumber: string;
    total: Decimal;
    paid: Decimal;
    discount?: Decimal;
    changeAmount: Decimal;

    status?: string;
    createdAt?: Date;
    updatedAt?: Date;

    // Refund/Return fields
    isRefund?: boolean;
    originalTransactionId?: string;
    refundReason?: string;
    refundedAmount?: Decimal;
    refundedAt?: Date;

    // Related data
    customer?: Customer;
    terminal?: Terminal;
    paymentMethod?: PaymentMethod;
    paymentServiceProvider?: PaymentServiceProvider;
    items?: CartItem[];
    user?: User;
    originalTransaction?: Transaction;
    refunds?: Transaction[];
    totalRefunded?: number;
    synced: number;
};

export type TransactionValues = {
    paymentMethodId?: string;
    paymentServiceProviderId?: string;
    phoneNumber: string;
    transactionId: string;
    cashTendered: string;
};

export interface DateRangeFilters {
    startDate: Date;
    endDate: Date;
    status?: number;
    user?: number;
    till?: number;
    includeItems: boolean;
    tenantId?: string;
    branchId?: string;
}
