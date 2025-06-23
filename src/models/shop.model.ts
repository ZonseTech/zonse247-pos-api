import { v4 as uuidv4 } from 'uuid';
import { sealDBModel } from '../databases/local';
import { TABLE_NAMES } from '../databases/local/tables';

export class ShopModel {

    static async findAll(conditions: any = {}): Promise<IShop[]> {
        return sealDBModel.find(TABLE_NAMES.SHOPS, conditions);
    }

    static async findByClientUuid(clientUuid: string): Promise<IShop[]> {
        return sealDBModel.find(TABLE_NAMES.SHOPS, { clientUuid });
    }

    static async findByShopCode(shopCode: string): Promise<IShop | null> {
        return sealDBModel.findById(TABLE_NAMES.SHOPS, { shopCode });
    }

    static async findByClientUuidAndShopCode(clientUuid: string, shopCode: string): Promise<IShop[]> {
        return sealDBModel.find(TABLE_NAMES.SHOPS, { clientUuid, shopCode });
    }

    static async findById(id: string): Promise<IShop | null> {
        return sealDBModel.findById(TABLE_NAMES.SHOPS, id);
    }

    static async create(shopData: Omit<IShop, 'id'>): Promise<IShop> {
        return sealDBModel.insert(TABLE_NAMES.SHOPS, shopData);
    }

    static async update(id: string, data: Partial<IShop>): Promise<number> {
        return sealDBModel.update(TABLE_NAMES.SHOPS, id, data);
    }

    static async delete(id: string): Promise<number> {
        return sealDBModel.delete(TABLE_NAMES.SHOPS, id);
    }

    static async count(conditions: any = {}): Promise<number> {
        return sealDBModel.count(TABLE_NAMES.SHOPS, conditions);
    }

    static async findByStatus(status: string): Promise<IShop[]> {
        return sealDBModel.find(TABLE_NAMES.SHOPS, { status });
    }

    static async findByCity(city: string): Promise<IShop[]> {
        return sealDBModel.find(TABLE_NAMES.SHOPS, { city });
    }

    static async findByState(state: string): Promise<IShop[]> {
        return sealDBModel.find(TABLE_NAMES.SHOPS, { state });
    }

    static async findByCountry(country: string): Promise<IShop[]> {
        return sealDBModel.find(TABLE_NAMES.SHOPS, { country });
    }

    static async findActiveShops(): Promise<IShop[]> {
        return sealDBModel.find(TABLE_NAMES.SHOPS, { status: 'active' });
    }

    static async findActiveShopsByClientUuid(clientUuid: string): Promise<IShop[]> {
        return sealDBModel.find(TABLE_NAMES.SHOPS, { clientUuid, status: 'active' });
    }

    static async getShopsByEmailDomain(domain: string): Promise<IShop[]> {
        const allShops = await sealDBModel.findAll(TABLE_NAMES.SHOPS);
        return allShops.filter((shop: IShop) =>
            shop.email && shop.email.toLowerCase().endsWith(`@${domain.toLowerCase()}`)
        );
    }

    static async getUnsyncedShops(): Promise<IShop[]> {
        return sealDBModel.getUnsyncedRecords(TABLE_NAMES.SHOPS);
    }

    static async markAsSynced(id: string): Promise<number> {
        return sealDBModel.markAsSynced(TABLE_NAMES.SHOPS, id);
    }

    static async clearAllShops(): Promise<number> {
        return sealDBModel.clearTable(TABLE_NAMES.SHOPS);
    }

    static buildShopData(data: CreateShopRequest): Omit<IShop, 'id'> {
        return {
            uuid: uuidv4(),
            clientUuid: data.clientUuid,
            shopCode: data.shopCode,
            name: data.name,
            description: data.description || '',
            addressLine1: data.addressLine1 || '',
            addressLine2: data.addressLine2 || '',
            city: data.city || '',
            state: data.state || '',
            postalCode: data.postalCode || '',
            country: data.country || '',
            phone: data.phone || '',
            email: data.email || '',
            taxNumber: data.taxNumber || '',
            currencyCode: data.currencyCode || 'MWK',
            currencySymbol: data.currencySymbol || 'MK',
            taxRate: data.taxRate || 0.00,
            chargeTax: data.chargeTax || false,
            receiptFooter: data.receiptFooter || '',
            logoUrl: data.logoUrl || '',
            status: 'active'
        };
    }

    static buildUpdateData(data: Partial<IShop>): Partial<IShop> {
        const {
            uuid,
            clientUuid,
            createdAt,
            ...updateableData
        } = data;

        return updateableData;
    }

    static validateShopData(data: Partial<IShop>): string | null {
        if (data.email && !this.isValidEmail(data.email)) {
            return 'Invalid email format';
        }

        if (data.taxRate && (data.taxRate < 0 || data.taxRate > 100)) {
            return 'Tax rate must be between 0 and 100';
        }

        if (data.status && !['active', 'inactive', 'suspended'].includes(data.status)) {
            return 'Invalid status. Must be active, inactive, or suspended';
        }

        if (data.phone && data.phone.length > 20) {
            return 'Phone number too long';
        }

        if (data.shopCode && !/^[A-Za-z0-9_-]+$/.test(data.shopCode)) {
            return 'Shop code can only contain letters, numbers, hyphens, and underscores';
        }

        return null;
    }

    private static isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static async findByEmail(email: string): Promise<IShop[]> {
        return sealDBModel.find(TABLE_NAMES.SHOPS, { email });
    }

    static async findByPhone(phone: string): Promise<IShop[]> {
        return sealDBModel.find(TABLE_NAMES.SHOPS, { phone });
    }

    static async findByTaxNumber(taxNumber: string): Promise<IShop[]> {
        return sealDBModel.find(TABLE_NAMES.SHOPS, { taxNumber });
    }

    static async findShopsWithPagination(
        conditions: any = {},
        page: number = 1,
        limit: number = 10
    ): Promise<{ shops: IShop[], total: number, page: number, limit: number }> {
        const allShops = await sealDBModel.find(TABLE_NAMES.SHOPS, conditions);
        const total = allShops.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const shops = allShops.slice(startIndex, endIndex);

        return {
            shops,
            total,
            page,
            limit
        };
    }

    static async findShopsWithSorting(
        conditions: any = {},
        sortBy: keyof IShop = 'name',
        sortOrder: 'asc' | 'desc' = 'asc'
    ): Promise<IShop[]> {
        const shops = await sealDBModel.find(TABLE_NAMES.SHOPS, conditions);

        return shops.sort((a: IShop, b: IShop) => {
            const aValue = a[sortBy];
            const bValue = b[sortBy];

            if (aValue === undefined && bValue === undefined) return 0;
            if (aValue === undefined) return sortOrder === 'asc' ? 1 : -1;
            if (bValue === undefined) return sortOrder === 'asc' ? -1 : 1;

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }
}