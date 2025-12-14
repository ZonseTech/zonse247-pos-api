import { PlanFeatureCategory } from 'subscription';
import prisma from '../databases/prisma/client';

export class PlanFeatureModel {
    static async findAll(): Promise<PlanFeatureCategory[]> {
        try {
            const categories = await prisma.planFeature.findMany({
                orderBy: { displayOrder: 'asc' }
            });

            return categories.map(category => ({
                featureCategoryId: category.featureCategoryId,
                title: category.title,
                features: category.features as string[],
                displayOrder: category.displayOrder || 0,
                createdAt: category.createdAt || undefined,
                updatedAt: category.updatedAt || undefined,
            }));
        } catch (error) {
            throw new Error(
                `Error finding plan features: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async findById(id: number): Promise<PlanFeatureCategory | null> {
        try {
            const category = await prisma.planFeature.findUnique({
                where: { featureCategoryId: id }
            });

            if (!category) {
                return null;
            }

            return {
                featureCategoryId: category.featureCategoryId,
                title: category.title,
                features: category.features as string[],
                displayOrder: category.displayOrder || 0,
                createdAt: category.createdAt || undefined,
                updatedAt: category.updatedAt || undefined,
            };
        } catch (error) {
            throw new Error(
                `Error finding plan feature by ID: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async create(data: Omit<PlanFeatureCategory, 'featureCategoryId' | 'createdAt' | 'updatedAt'>): Promise<PlanFeatureCategory> {
        try {
            const category = await prisma.planFeature.create({
                data: {
                    title: data.title,
                    features: data.features as any,
                    displayOrder: data.displayOrder || 0,
                }
            });

            return {
                featureCategoryId: category.featureCategoryId,
                title: category.title,
                features: category.features as string[],
                displayOrder: category.displayOrder || 0,
                createdAt: category.createdAt || undefined,
                updatedAt: category.updatedAt || undefined,
            };
        } catch (error) {
            throw new Error(
                `Error creating plan feature: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async update(id: number, data: Partial<PlanFeatureCategory>): Promise<number> {
        try {
            await prisma.planFeature.update({
                where: { featureCategoryId: id },
                data: {
                    ...(data.title && { title: data.title }),
                    ...(data.features && { features: data.features as any }),
                    ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
                    updatedAt: new Date()
                }
            });
            return 1;
        } catch (error) {
            throw new Error(
                `Error updating plan feature: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    static async delete(id: number): Promise<number> {
        try {
            await prisma.planFeature.delete({
                where: { featureCategoryId: id }
            });
            return 1;
        } catch (error) {
            throw new Error(
                `Error deleting plan feature: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }
}
