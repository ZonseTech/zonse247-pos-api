import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { sealDBModel } from '../databases/local';
import { USERS_DB } from '../databases/local/tables';
import { ValidationParams } from 'on-boarding';
import { PublicUser, User, UserStatus } from 'users';
import prisma from '../databases/prisma/client';

const saltRounds = 10;

export class UserModel {

    static async findAllByRDBMS(conditions: ValidationParams): Promise<User[]> {
        try {
            return await prisma.user.findMany({
                where: {
                    tenantId: conditions.tenantId,
                },
            }) as unknown as Array<User>
        } catch (error) {
            throw new Error(
                `Error finding users: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }


    static async findAll(conditions: any = {}): Promise<User[]> {
        try {
            return await sealDBModel.find(USERS_DB, conditions);
        } catch (error) {
            throw new Error(`Error finding users: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findById(id: string): Promise<User | null> {
        try {
            return await sealDBModel.findById<User>(USERS_DB, id);
        } catch (error) {
            throw new Error(`Error finding user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByUuid(uuid: string): Promise<User | null> {
        try {
            const users = await sealDBModel.find<User[]>(USERS_DB, { uuid: uuid });
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            throw new Error(`Error finding user by UUID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByUsername(username: string): Promise<User | null> {
        try {
            const users = await sealDBModel.findById<User>(USERS_DB, { username: username });
            return users;
        } catch (error) {
            throw new Error(`Error finding user by username: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByEmail(email: string): Promise<User | null> {
        try {
            const users = await sealDBModel.find<User[]>(USERS_DB, { email: email });
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            throw new Error(`Error finding user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByRoleId(roleUuid: string): Promise<User[]> {
        try {
            return await sealDBModel.find(USERS_DB, { roleUuid: roleUuid });
        } catch (error) {
            throw new Error(`Error finding users by role: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByTenantId(tenantId: string): Promise<User[]> {
        try {
            return await sealDBModel.find(USERS_DB, { tenantId });
        } catch (error) {
            throw new Error(`Error finding users by client ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByBranchId(shopUuid: string): Promise<User[]> {
        try {
            return await sealDBModel.find(USERS_DB, { shopUuid: shopUuid });
        } catch (error) {
            throw new Error(`Error finding users by shop ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByCurrentTerminalId(currentTerminaId: string): Promise<User[]> {
        try {
            return await sealDBModel.find(USERS_DB, { currentTerminaId: currentTerminaId });
        } catch (error) {
            throw new Error(`Error finding users by current shop ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByStatus(status: UserStatus): Promise<User[]> {
        try {
            return await sealDBModel.find(USERS_DB, { status: status });
        } catch (error) {
            throw new Error(`Error finding users by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByUsernameOrEmail(username: string, email: string): Promise<User[]> {
        try {
            return await sealDBModel.find(USERS_DB, {
                $or: [
                    { username: username },
                    { email: email }
                ]
            });
        } catch (error) {
            throw new Error(`Error finding user by username or email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByPinCode(pinCode: string): Promise<User | null> {
        try {
            const users = await sealDBModel.find<User[]>(USERS_DB, { pinCode: pinCode });
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            throw new Error(`Error finding user by PIN code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findUsersNeedingPasswordChange(): Promise<User[]> {
        try {
            return await sealDBModel.find(USERS_DB, { forcePasswordChange: true });
        } catch (error) {
            throw new Error(`Error finding users needing password change: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async buildUserData(data: Partial<User>): Promise<User> {
        const now = new Date();
        const hashedPassword = await bcrypt.hash(data.password, saltRounds);

        return {
            userId: uuidv4(),
            tenantId: data.tenantId || '',
            branchId: data.branchId || '',
            username: data.username,
            password: hashedPassword,
            fullname: data.fullname || '',
            email: data.email || null,
            phone: data.phone || null,
            roleId: data.roleId,
            status: data.status || 'active',
            accessibleShops: data.accessibleShops || null,
            allowedWorkstations: data.allowedWorkstations || null,
            maxDiscountPercent: data.maxDiscountPercent || 0,
            canOverridePrices: data.canOverridePrices || false,
            pinCode: data.pinCode || null,
            currentBranchId: data.currentBranchId || null,
            passwordChangedAt: now,
            forcePasswordChange: data.forcePasswordChange || false,
            createdAt: now,
            updatedAt: now
        };
    }

    static async exists(userId: string): Promise<boolean> {
        try {
            const result = await sealDBModel.findById(USERS_DB, { userId });

            if (!result || typeof result !== 'object') {
                return false;
            }

            const hasKeys = Object.keys(result).length > 0;

            return hasKeys;

        } catch (error) {
            console.error('Error checking if user exists:', error);
            return false;
        }
    }

    static async insert(data: User): Promise<User> {
        return await sealDBModel.insert(USERS_DB, data);
    }

    static async create(userData: User): Promise<User> {
        try {
            return await sealDBModel.insert(USERS_DB, userData);
        } catch (error) {
            throw new Error(`Error creating user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async update(id: string, updateData: Partial<User>): Promise<number> {
        try {
            const updateDataWithTimestamp = {
                ...updateData,
                updatedAt: new Date()
            };

            if (updateData.password && updateData.password !== '') {
                updateDataWithTimestamp.password = await bcrypt.hash(updateData.password, saltRounds);
                updateDataWithTimestamp.passwordChangedAt = new Date();
            }

            return await sealDBModel.update(USERS_DB, { userId: id }, updateDataWithTimestamp);
        } catch (error) {
            throw new Error(`Error updating user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async updateLastLogin(id: string): Promise<number> {
        try {
            return await sealDBModel.update(USERS_DB, { userId: id }, {
                lastLogin: new Date(),
                updatedAt: new Date()
            });
        } catch (error) {
            throw new Error(`Error updating last login: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async updateLastLogout(id: string): Promise<number> {
        try {
            return await sealDBModel.update(USERS_DB, { userId: id }, {
                lastLogout: new Date(),
                updatedAt: new Date()
            });
        } catch (error) {
            throw new Error(`Error updating last logout: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async updateCurrentShop(id: string, currentBranchId: string): Promise<number> {
        try {
            return await sealDBModel.update(USERS_DB, { userId: id }, {
                currentBranchId: currentBranchId,
                updatedAt: new Date()
            });
        } catch (error) {
            throw new Error(`Error updating current shop: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async forcePasswordChange(id: string, force = true): Promise<number> {
        try {
            return await sealDBModel.update(USERS_DB, { userId: id }, {
                forcePasswordChange: force,
                updatedAt: new Date()
            });
        } catch (error) {
            throw new Error(`Error updating force password change: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async updatePinCode(id: string, pinCode: string | null): Promise<number> {
        try {
            return await sealDBModel.update(USERS_DB, { userId: id }, {
                pinCode: pinCode,
                updatedAt: new Date()
            });
        } catch (error) {
            throw new Error(`Error updating PIN code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async delete(id: string): Promise<number> {
        try {
            return await sealDBModel.delete(USERS_DB, { userId: id });
        } catch (error) {
            throw new Error(`Error deleting user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async count(conditions: any = {}): Promise<number> {
        try {
            return await sealDBModel.count(USERS_DB, conditions);
        } catch (error) {
            throw new Error(`Error counting users: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async checkUserExists(username: string, email: string): Promise<boolean> {
        try {
            const users = await this.findByUsernameOrEmail(username, email);
            return users.length > 0;
        } catch (error) {
            throw new Error(`Error checking if user exists: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        try {
            return await bcrypt.compare(plainPassword, hashedPassword);
        } catch (error) {
            throw new Error(`Error validating password: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static getPublicUser(user: User): PublicUser {
        const { password: _, ...publicUser } = user;
        return publicUser;
    }
}