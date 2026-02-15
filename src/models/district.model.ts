import { v4 as uuidv4 } from 'uuid';
import prisma from '../databases/prisma/client';
import { District, CreateDistrictDto, UpdateDistrictDto, DistrictFilters } from 'district';

export class DistrictModel {
    static async findAll(filters?: DistrictFilters): Promise<District[]> {
        try {
            const where: any = {};

            if (filters?.region) {
                where.region = filters.region;
            }

            if (filters?.isActive !== undefined) {
                where.isActive = filters.isActive;
            }

            return await prisma.district.findMany({
                where,
                orderBy: [
                    { region: 'asc' },
                    { name: 'asc' }
                ]
            }) as unknown as District[];
        } catch (error) {
            throw new Error(`Error finding districts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findById(districtId: string): Promise<District | null> {
        try {
            return await prisma.district.findUnique({
                where: { districtId }
            }) as unknown as District | null;
        } catch (error) {
            throw new Error(`Error finding district by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByCode(code: string): Promise<District | null> {
        try {
            return await prisma.district.findUnique({
                where: { code }
            }) as unknown as District | null;
        } catch (error) {
            throw new Error(`Error finding district by code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByName(name: string): Promise<District | null> {
        try {
            return await prisma.district.findFirst({
                where: { name }
            }) as unknown as District | null;
        } catch (error) {
            throw new Error(`Error finding district by name: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async findByRegion(region: string): Promise<District[]> {
        try {
            return await prisma.district.findMany({
                where: { region },
                orderBy: { name: 'asc' }
            }) as unknown as District[];
        } catch (error) {
            throw new Error(`Error finding districts by region: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async create(data: CreateDistrictDto): Promise<District> {
        try {
            return await prisma.district.create({
                data: {
                    districtId: uuidv4(),
                    name: data.name,
                    region: data.region,
                    code: data.code,
                    isActive: data.isActive ?? true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            }) as unknown as District;
        } catch (error) {
            throw new Error(`Error creating district: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async update(districtId: string, data: UpdateDistrictDto): Promise<District> {
        try {
            return await prisma.district.update({
                where: { districtId },
                data: {
                    ...data,
                    updatedAt: new Date()
                }
            }) as unknown as District;
        } catch (error) {
            throw new Error(`Error updating district: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async delete(districtId: string): Promise<District> {
        try {
            return await prisma.district.delete({
                where: { districtId }
            }) as unknown as District;
        } catch (error) {
            throw new Error(`Error deleting district: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async count(filters?: DistrictFilters): Promise<number> {
        try {
            const where: any = {};

            if (filters?.region) {
                where.region = filters.region;
            }

            if (filters?.isActive !== undefined) {
                where.isActive = filters.isActive;
            }

            return await prisma.district.count({ where });
        } catch (error) {
            throw new Error(`Error counting districts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    static async exists(districtId: string): Promise<boolean> {
        try {
            const district = await prisma.district.findUnique({
                where: { districtId },
                select: { districtId: true }
            });
            return !!district;
        } catch (error) {
            return false;
        }
    }

    static async upsert(data: CreateDistrictDto & { districtId?: string }): Promise<District> {
        try {
            const districtId = data.districtId || uuidv4();
            return await prisma.district.upsert({
                where: { code: data.code },
                update: {
                    name: data.name,
                    region: data.region,
                    isActive: data.isActive ?? true,
                    updatedAt: new Date()
                },
                create: {
                    districtId,
                    name: data.name,
                    region: data.region,
                    code: data.code,
                    isActive: data.isActive ?? true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            }) as unknown as District;
        } catch (error) {
            throw new Error(`Error upserting district: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
