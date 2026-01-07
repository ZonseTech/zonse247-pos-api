import { Customer } from "customer";
import { CartItem } from "order";
import { PaymentMethod } from "payment-method";
import { PaymentServiceProvider } from "payment-service-provider";
import { Terminal } from "terminal";
import { User } from "users";

// Database-agnostic decimal type (MySQL uses Decimal, SQLite uses number)
type DecimalValue = number | { toNumber(): number };

export type Transaction = {
    refNumber?: string;
    subtotal: DecimalValue;
    tax: DecimalValue;
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
    total: DecimalValue;
    paid: DecimalValue;
    discount?: DecimalValue;
    changeAmount: DecimalValue;

    status?: string;
    createdAt?: Date;
    updatedAt?: Date;

    // Refund/Return fields
    isRefund?: boolean;
    originalTransactionId?: string;
    refundReason?: string;
    refundedAmount?: DecimalValue;
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
