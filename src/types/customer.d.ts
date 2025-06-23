interface Customer {
    uuid: string;
    name: string;
    clientUuid?: string;
    shopUuid?: string;
    userUuid?: string;
    phone?: string;
    email?: string;
    address?: string;
    synced?: 0 | 1;
}

interface CreateCustomerData {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
}

interface UpdateCustomerData {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
}

interface SearchConditions {
    name?: string;
    email?: string;
    phone?: string;
    [key: string]: any;
}