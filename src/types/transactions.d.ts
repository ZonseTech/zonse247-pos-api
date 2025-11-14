type Transaction = {
    refNumber?: string;
    discount: number;
    subtotal: number;
    tax: number;
    date: string;
    userId: string;
    tenantId?: string;
    branchId?: string;
    customerId?: string;
    paymentServiceProviderId?: string;
    transactionId?: string;
    paymentMethodId?: string;
    terminalId: string;
    phoneNumber: string;
    total: number;
    paid: number;
    discount?: number;
    changeAmount: number;

    status?: string;
    createdAt?: Date;
    updatedAt?: Date;

    customer?: Customer;
    workstation?: Workstation;
    paymentMethod?: PaymentMethod;
    paymentServiceProvider?: PaymentServiceProvider;
    items?: CartItem[];
    user?: User;
    synced?: 1 | 0;
};

type TransactionValues = {
    paymentMethodId?: string;
    paymentServiceProviderId?: string;
    phoneNumber: string;
    transactionId: string;
    cashTendered: string;
};

interface DateRangeFilters {
    startDate: Date;
    endDate: Date;
    status?: number;
    user?: number;
    till?: number;
    includeItems: boolean;
}
