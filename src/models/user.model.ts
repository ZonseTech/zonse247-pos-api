import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';
import { getConfig } from '../config/app.config';
import type { PublicUser, User, UserQueryParams } from 'users';
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
            synced: 0,
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

            if (updateDataWithTimestamp.roleId) {
                updateDataWithTimestamp.role = { connect: { roleId: updateDataWithTimestamp.roleId } };
                delete updateDataWithTimestamp.roleId;
            }

            if ('currentBranchId' in updateDataWithTimestamp) {
                if (updateDataWithTimestamp.currentBranchId) {
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