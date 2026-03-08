import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { BranchModel } from './branch.model';
import prisma from '../databases/prisma/client';
import { getConfig } from '../config/app.config';
import type { PublicUser, User, UserQueryParams } from 'users';
import { BranchSubscriptionModel } from './branch-subscription.model';
import { UserCreateManyInput } from '../databases/prisma/generated/prisma/models';

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

    static async findByUsername(username: string): Promise<User | null> {
        try {
            return await prisma.user.findFirst({
                where: { username }
            }) as unknown as User | null;
        } catch (error) {
            throw new Error(`Error finding user by username: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByUsernameWithRelations(username: string): Promise<User | null> {
        try {
            return await prisma.user.findFirst({
                where: { username },
                include: {
                    role: {
                        include: {
                            rolePermissions: {
                                include: {
                                    permission: true
                                }
                            }
                        }
                    },
                    branch: true,
                    tenant: true,
                    currentBranch: true
                }
            }) as unknown as User | null;
        } catch (error) {
            throw new Error(`Error finding user by username with relations: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByIdWithRelations(id: string): Promise<User | null> {
        try {
            return await prisma.user.findUnique({
                where: { userId: id },
                include: {
                    role: {
                        include: {
                            rolePermissions: {
                                include: {
                                    permission: true
                                }
                            }
                        }
                    },
                    branch: true,
                    tenant: true,
                    currentBranch: true
                }
            }) as unknown as User | null;
        } catch (error) {
            throw new Error(`Error finding user by ID with relations: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            accessibleBranches: (data.accessibleBranches || ['*']) as unknown as any,
            allowedTerminals: (data.allowedTerminals || null) as unknown as any,
            maxDiscountPercent: parseFloat((data.maxDiscountPercent || 0).toString()),
            canOverridePrices: data.canOverridePrices || false,
            pinCode: data.pinCode || null,
            currentBranchId: data.currentBranchId || null,
            passwordChangedAt: now,
            forcePasswordChange: data.forcePasswordChange || false,
            createdAt: now,
            updatedAt: now
        };
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

    /**
     * Create or update user - creates user if not exists, updates if exists
     * Used for offline sync operations
     * 
     * @param userData - User data including optional branch object for offline sync
     * @param branchData - Optional branch data to save (from login with offlineMode: true)
     */
    static async createOrUpdate(
        userData: UserCreateManyInput,
        branchData?: any
    ): Promise<{ user: User; created: boolean }> {
        try {
            if (branchData && branchData.branchId) {
                await this.saveBranchOffline(branchData);
            } else if (userData.branchId) {
                await this.ensureBranchExists(userData.branchId, userData.tenantId);
            }

            if (userData.roleId) {
                await this.ensureRoleExists(userData.roleId);
            }

            if (userData.currentBranchId && userData.currentBranchId !== userData.branchId) {
                await this.ensureBranchExists(userData.currentBranchId, userData.tenantId);
            }

            const existingUser = await this.findByUsername(userData.username);

            if (existingUser) {
                const updateData: any = { ...userData };

                if (!updateData.password) {
                    delete updateData.password;
                }

                await this.update(existingUser.userId, updateData);
                const updatedUser = await this.findById(existingUser.userId);
                return { user: updatedUser as User, created: false };
            }

            const user = await this.buildUserData(userData);
            const createdUser = await prisma.user.create({
                data: user as any
            }) as unknown as User;

            return { user: createdUser, created: true };
        } catch (error) {
            throw new Error(`Error in createOrUpdate user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Saves branch data to offline database using BranchModel
     * Order: 1) BranchSubscription (if SubscriptionPlan exists), 2) Branch
     */
    private static async saveBranchOffline(branchData: any): Promise<void> {
        let branchSubscriptionId = branchData.branchSubscriptionId || null;

        if (branchData.branchSubscription?.branchSubscriptionId && branchData.branchSubscription?.subscriptionPlanId) {
            const planExists = await prisma.subscriptionPlan.findUnique({
                where: { subscriptionPlanId: branchData.branchSubscription.subscriptionPlanId }
            });

            if (planExists) {
                const { subscription } = await BranchSubscriptionModel.createOrUpdate(branchData.branchSubscription);
                branchSubscriptionId = subscription.branchSubscriptionId;
            } else {
                console.warn(`SubscriptionPlan ${branchData.branchSubscription.subscriptionPlanId} not found. Skipping BranchSubscription creation.`);
            }
        }

        const normalizedBranch = {
            ...branchData,
            branchName: branchData.branchName || branchData.name || branchData.branchId,
            branchCode: branchData.branchCode || branchData.branchId?.substring(0, 20),
            phoneNumber: branchData.phoneNumber || branchData.phone,
            addressLine1: branchData.addressLine1 || branchData.address,
            branchSubscriptionId: branchSubscriptionId
        };

        delete normalizedBranch.branchSubscription;
        delete normalizedBranch.tenant;

        await BranchModel.createOrUpdate(normalizedBranch);
    }

    /**
     * Ensures a branch exists in the local database using BranchModel
     * Creates a minimal placeholder if it doesn't exist
     */
    private static async ensureBranchExists(branchId: string, tenantId: string): Promise<void> {
        const existingBranch = await BranchModel.findById(branchId);

        if (!existingBranch) {
            await BranchModel.create({
                branchId,
                tenantId,
                branchName: branchId,
                branchCode: branchId.substring(0, 20),
                status: 'active'
            } as any);
        }
    }

    /**
     * Ensures a role exists in the local database
     * Creates a minimal placeholder if it doesn't exist
     */
    private static async ensureRoleExists(roleId: string): Promise<void> {
        const existingRole = await prisma.role.findUnique({
            where: { roleId }
        });

        if (!existingRole) {
            await prisma.role.create({
                data: {
                    roleId,
                    name: roleId,
                    displayName: roleId,
                    isSystemRole: false,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
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
            delete updateDataWithTimestamp.roleName;
            delete updateDataWithTimestamp.permissions;
            delete updateDataWithTimestamp.roles;
            delete updateDataWithTimestamp.departmentName;
            delete updateDataWithTimestamp.branch;

            if (updateDataWithTimestamp.branchId) {
                await this.ensureBranchExists(updateDataWithTimestamp.branchId, updateDataWithTimestamp.tenantId || '-1');
            }

            if (updateDataWithTimestamp.roleId) {
                await this.ensureRoleExists(updateDataWithTimestamp.roleId);
                updateDataWithTimestamp.role = { connect: { roleId: updateDataWithTimestamp.roleId } };
                delete updateDataWithTimestamp.roleId;
            }

            if ('currentBranchId' in updateDataWithTimestamp) {
                if (updateDataWithTimestamp.currentBranchId) {
                    await this.ensureBranchExists(updateDataWithTimestamp.currentBranchId, updateDataWithTimestamp.tenantId || '-1');
                    updateDataWithTimestamp.currentBranch = { connect: { branchId: updateDataWithTimestamp.currentBranchId } };
                } else {
                    updateDataWithTimestamp.currentBranch = { disconnect: true };
                }
                delete updateDataWithTimestamp.currentBranchId;
            }

            if (updateData.password && updateData.password !== '') {
                const config = getConfig();
                updateDataWithTimestamp.password = await bcrypt.hash(updateData.password, config.bcryptSaltRounds);
                updateDataWithTimestamp.passwordChangedAt = new Date();
            }

            await prisma.user.update({
                where: { userId: id },
                data: updateDataWithTimestamp
            });

            return 1;
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

    static async delete(id: string): Promise<number> {
        try {
            await prisma.user.delete({
                where: { userId: id }
            });

            return 1;
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