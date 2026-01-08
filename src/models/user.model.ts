import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';
import type { PublicUser, User, UserQueryParams, UserStatus } from 'users';
import { UserCreateManyInput } from '../databases/prisma/generated/prisma/models';
import { getConfig } from '../config/app.config';

export class UserModel {
    static async findAll(conditions: UserQueryParams = {}): Promise<User[]> {
        try {
            return await prisma.user.findMany({
                where: conditions,
                orderBy: { createdAt: 'desc' }
            }) as unknown as User[];
        } catch (error) {
            throw new Error(`Error finding users: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findById(id: string, tenantId?: string, branchId?: string): Promise<User | null> {
        try {
            const user = await prisma.user.findUnique({
                where: { userId: id }
            }) as unknown as User | null;

            if (user) {
                if (tenantId && user.tenantId !== tenantId) return null;
                if (branchId && user.branchId !== branchId) return null;
            }
            return user;
        } catch (error) {
            throw new Error(`Error finding user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByUuid(userId: string): Promise<User | null> {
        return await this.findById(userId);
    }

    static async findByUsername(username: string): Promise<User | null> {
        try {
            return await prisma.user.findFirst({
                where: { username }
            }) as unknown as User | null;
        } catch (error) {
            throw new Error(`Error finding user by username: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByEmail(email: string): Promise<User | null> {
        try {
            return await prisma.user.findFirst({
                where: { email }
            }) as unknown as User | null;
        } catch (error) {
            throw new Error(`Error finding user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByRoleId(roleId: string, tenantId?: string, branchId?: string): Promise<User[]> {
        try {
            const where: any = { roleId };
            if (tenantId) where.tenantId = tenantId;
            if (branchId) where.branchId = branchId;

            return await prisma.user.findMany({
                where
            }) as unknown as User[];
        } catch (error) {
            throw new Error(`Error finding users by role: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByTenantId(tenantId: string): Promise<User[]> {
        try {
            return await prisma.user.findMany({
                where: { tenantId }
            }) as unknown as User[];
        } catch (error) {
            throw new Error(`Error finding users by tenant ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByBranchId(branchId: string, tenantId?: string): Promise<User[]> {
        try {
            const where: any = { branchId };
            if (tenantId) where.tenantId = tenantId;

            return await prisma.user.findMany({
                where
            }) as unknown as User[];
        } catch (error) {
            throw new Error(`Error finding users by branch ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByCurrentBranchId(currentBranchId: string): Promise<User[]> {
        try {
            return await prisma.user.findMany({
                where: { currentBranchId }
            }) as unknown as User[];
        } catch (error) {
            throw new Error(`Error finding users by current branch ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByStatus(status: UserStatus): Promise<User[]> {
        try {
            return await prisma.user.findMany({
                where: { status }
            }) as unknown as User[];
        } catch (error) {
            throw new Error(`Error finding users by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByUsernameOrEmail(username: string, email: string): Promise<User[]> {
        try {
            return await prisma.user.findMany({
                where: {
                    OR: [
                        { username },
                        { email }
                    ]
                }
            }) as unknown as User[];
        } catch (error) {
            throw new Error(`Error finding user by username or email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByPinCode(pinCode: string): Promise<User | null> {
        try {
            return await prisma.user.findFirst({
                where: { pinCode }
            }) as unknown as User | null;
        } catch (error) {
            throw new Error(`Error finding user by PIN code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findUsersNeedingPasswordChange(): Promise<User[]> {
        try {
            return await prisma.user.findMany({
                where: { forcePasswordChange: true }
            }) as unknown as User[];
        } catch (error) {
            throw new Error(`Error finding users needing password change: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findUnsynced(): Promise<User[]> {
        try {
            return await prisma.user.findMany({
                where: { synced: 0 }
            }) as unknown as User[];
        } catch (error) {
            throw new Error(`Error finding unsynced users: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findUnsyncedByTenant(tenantId: string): Promise<User[]> {
        try {
            return await prisma.user.findMany({
                where: {
                    tenantId,
                    synced: 0
                }
            }) as unknown as User[];
        } catch (error) {
            throw new Error(`Error finding unsynced users by tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async buildUserData(data: UserCreateManyInput) {
        const now = new Date();
        const config = getConfig();
        const hashedPassword = await bcrypt.hash(data.password, config.bcryptSaltRounds);

        return {
            userId: data.userId || uuidv4(),
            branchId: data.branchId,
            tenantId: data.tenantId,
            username: data.username,
            password: hashedPassword,
            fullname: data.fullname,
            email: data.email || null,
            phone: data.phone || null,
            roleId: data.roleId,
            status: data.status || 'active',
            accessibleBranches: (data.accessibleBranches || null) as unknown as any,
            allowedTerminals: (data.allowedTerminals || null) as unknown as any,
            maxDiscountPercent: parseFloat((data.maxDiscountPercent || 0).toString()),
            canOverridePrices: data.canOverridePrices || false,
            pinCode: data.pinCode || null,
            currentBranchId: data.currentBranchId || null,
            passwordChangedAt: now,
            forcePasswordChange: data.forcePasswordChange || false,
            synced: 0,
            createdAt: now,
            updatedAt: now
        };
    }

    static async exists(userId: string): Promise<boolean> {
        try {
            const count = await prisma.user.count({
                where: { userId }
            });
            return count > 0;
        } catch (error) {
            console.error('Error checking if user exists:', error);
            return false;
        }
    }

    static async insert(data: User): Promise<User> {
        try {
            return await prisma.user.create({
                data: data as any
            }) as unknown as User;
        } catch (error) {
            throw new Error(`Error inserting user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async create(userData: UserCreateManyInput): Promise<User> {
        try {
            const user = await this.buildUserData(userData);
            return await prisma.user.create({
                data: user as any
            }) as unknown as User;
        } catch (error) {
            throw new Error(`Error creating user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async update(id: string, updateData: Partial<User>): Promise<number> {
        try {
            const updateDataWithTimestamp: any = {
                ...updateData,
                updatedAt: new Date()
            };

            delete updateDataWithTimestamp.userId;
            delete updateDataWithTimestamp.createdAt;

            if (updateData.password && updateData.password !== '') {
                const config = getConfig();
                updateDataWithTimestamp.password = await bcrypt.hash(updateData.password, config.bcryptSaltRounds);
                updateDataWithTimestamp.passwordChangedAt = new Date();
            }

            await prisma.user.update({
                where: { userId: id },
                data: updateDataWithTimestamp
            });

            return 1; // Return 1 to indicate successful update
        } catch (error) {
            throw new Error(`Error updating user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async updateLastLogin(id: string): Promise<number> {
        try {
            return await this.update(id, {
                lastLogin: new Date()
            });
        } catch (error) {
            throw new Error(`Error updating last login: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async updateLastLogout(id: string): Promise<number> {
        try {
            return await this.update(id, {
                lastLogout: new Date()
            });
        } catch (error) {
            throw new Error(`Error updating last logout: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async updateCurrentBranch(id: string, currentBranchId: string): Promise<number> {
        try {
            return await this.update(id, { currentBranchId });
        } catch (error) {
            throw new Error(`Error updating current branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async updatePassword(id: string, newPassword: string): Promise<number> {
        try {
            const config = getConfig();
            const hashedPassword = await bcrypt.hash(newPassword, config.bcryptSaltRounds);
            return await this.update(id, {
                password: hashedPassword,
                passwordChangedAt: new Date(),
                forcePasswordChange: false
            });
        } catch (error) {
            throw new Error(`Error updating password: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async forcePasswordChange(id: string, force = true): Promise<number> {
        try {
            return await this.update(id, { forcePasswordChange: force });
        } catch (error) {
            throw new Error(`Error updating force password change: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async updatePinCode(id: string, pinCode: string | null): Promise<number> {
        try {
            return await this.update(id, { pinCode });
        } catch (error) {
            throw new Error(`Error updating PIN code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async delete(id: string): Promise<number> {
        try {
            await prisma.user.delete({
                where: { userId: id }
            });

            return 1; // Return 1 to indicate successful deletion
        } catch (error) {
            throw new Error(`Error deleting user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async count(conditions: UserQueryParams = {}): Promise<number> {
        try {
            return await prisma.user.count({
                where: conditions
            });
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
        const { ...publicUser } = user;

        delete publicUser.password
        return publicUser;
    }
}