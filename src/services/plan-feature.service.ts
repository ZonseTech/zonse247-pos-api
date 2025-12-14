import { PlanFeatureCategory } from 'subscription';
import { PlanFeatureModel } from '../models/plan-feature.model';

export class PlanFeatureService {
    static async getAll(): Promise<PlanFeatureCategory[]> {
        return PlanFeatureModel.findAll();
    }

    static async getById(id: number): Promise<PlanFeatureCategory | null> {
        return PlanFeatureModel.findById(id);
    }

    static async create(data: Omit<PlanFeatureCategory, 'featureCategoryId' | 'createdAt' | 'updatedAt'>): Promise<PlanFeatureCategory> {
        return PlanFeatureModel.create(data);
    }

    static async update(id: number, data: Partial<PlanFeatureCategory>): Promise<PlanFeatureCategory | null> {
        const existing = await PlanFeatureModel.findById(id);
        if (!existing) {
            return null;
        }

        const numUpdated = await PlanFeatureModel.update(id, data);
        if (numUpdated === 0) {
            return null;
        }

        return PlanFeatureModel.findById(id);
    }

    static async delete(id: number): Promise<boolean> {
        const numDeleted = await PlanFeatureModel.delete(id);
        return numDeleted > 0;
    }
}
