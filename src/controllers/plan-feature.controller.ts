import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { BaseService } from "../services/base.service";
import { PlanFeatureService } from "../services/plan-feature.service";

export class PlanFeatureController extends BaseController {
    static async list(req: Request, res: Response): Promise<void> {
        try {
            const response = await BaseService.get('/plan-features/all');

            if (!response.success) {
                throw "External application down. Please try again later."
            }

            const features = response.data
            BaseController.sendResponse(res, 200, true, 'Plan features retrieved successfully', features);
        } catch (error: any) {
            console.error('Error fetching plan features:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch plan features', undefined, error.message);
        }
    }

    static async index(req: Request, res: Response): Promise<void> {
        try {
            const features = await PlanFeatureService.getAll();
            BaseController.sendResponse(res, 200, true, 'Plan features retrieved successfully', features);
        } catch (error: any) {
            console.error('Error fetching plan features:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch plan features', undefined, error.message);
        }
    }

    static async show(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const feature = await PlanFeatureService.getById(Number(id));

            if (!feature) {
                BaseController.sendResponse(res, 404, false, 'Plan feature not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Plan feature retrieved successfully', feature);
        } catch (error: any) {
            console.error('Error fetching plan feature:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to fetch plan feature', undefined, error.message);
        }
    }

    static async store(req: Request, res: Response): Promise<void> {
        try {
            const newFeature = await PlanFeatureService.create(req.body);
            BaseController.sendResponse(res, 201, true, 'Plan feature created successfully', newFeature);
        } catch (error: any) {
            console.error('Error creating plan feature:', error);

            let statusCode = 500;
            if (error.message.includes('required') || error.message.includes('Invalid')) {
                statusCode = 400;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async update(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updatedFeature = await PlanFeatureService.update(Number(id), req.body);

            if (!updatedFeature) {
                BaseController.sendResponse(res, 404, false, 'Plan feature not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Plan feature updated successfully', updatedFeature);
        } catch (error: any) {
            console.error('Error updating plan feature:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('Invalid')) {
                statusCode = 422;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async delete(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const deleted = await PlanFeatureService.delete(Number(id));

            if (!deleted) {
                BaseController.sendResponse(res, 404, false, 'Plan feature not found');
                return;
            }

            BaseController.sendResponse(res, 200, true, 'Plan feature deleted successfully');
        } catch (error: any) {
            console.error('Error deleting plan feature:', error);
            BaseController.sendResponse(res, 500, false, 'Failed to delete plan feature', undefined, error.message);
        }
    }
}
