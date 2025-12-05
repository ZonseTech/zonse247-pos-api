import { ValidationParams } from 'on-boarding';
import { sealDBModel } from '../databases/local';
import { CUSTOMERS_DB } from '../databases/local/tables';
import { Role } from 'role-permission';
import { Customer } from 'customer';
import prisma from '../databases/prisma/client';

export class CustomerModel {
    private static tableName = CUSTOMERS_DB;

    static async findAllByRDBMS(conditions: ValidationParams): Promise<Role[]> {
        try {
            return await prisma.role.findMany({
                where: {},
            }) as unknown as Array<Role>;
        } catch (error) {
            conditions
            throw new Error(`Error finding roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findById(id: string): Promise<Customer | null> {
        try {
            return await sealDBModel.findById<Customer>(this.tableName, id);
        } catch (error) {
            console.error('CustomerModel.findById error:', error);
            throw error;
        }
    }

    static async findAll(): Promise<Customer[]> {
        try {
            return await sealDBModel.findAll(this.tableName);
        } catch (error) {
            console.error('CustomerModel.findAll error:', error);
            throw error;
        }
    }

    static async find(conditions: any = {}): Promise<Customer[]> {
        try {
            return await sealDBModel.find<Customer[]>(this.tableName, conditions);
        } catch (error) {
            console.error('CustomerModel.find error:', error);
            throw error;
        }
    }

    static async create(customerData: Omit<Customer, 'uuid' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
        try {
            return await sealDBModel.insert(this.tableName, customerData);
        } catch (error) {
            console.error('CustomerModel.create error:', error);
            throw error;
        }
    }

    static async update(id: string, updateData: Partial<Customer>): Promise<number> {
        try {
            return await sealDBModel.update(this.tableName, id, updateData);
        } catch (error) {
            console.error('CustomerModel.update error:', error);
            throw error;
        }
    }

    static async delete(id: string): Promise<number> {
        try {
            return await sealDBModel.delete(this.tableName, id);
        } catch (error) {
            console.error('CustomerModel.delete error:', error);
            throw error;
        }
    }

    static async count(conditions: any = {}): Promise<number> {
        try {
            return await sealDBModel.count(this.tableName, conditions);
        } catch (error) {
            console.error('CustomerModel.count error:', error);
            throw error;
        }
    }

    static async getUnsyncedRecords(): Promise<Customer[]> {
        try {
            return await sealDBModel.getUnsyncedRecords(this.tableName);
        } catch (error) {
            console.error('CustomerModel.getUnsyncedRecords error:', error);
            throw error;
        }
    }

    static async markAsSynced(id: string): Promise<number> {
        try {
            return await sealDBModel.markAsSynced(this.tableName, id);
        } catch (error) {
            console.error('CustomerModel.markAsSynced error:', error);
            throw error;
        }
    }
}