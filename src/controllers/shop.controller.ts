import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { ShopService } from "../services/shop.service";
import { WorkstationService } from "../services/workstation.service";

export class ShopController extends BaseController {

    static async list(req: Request, res: Response): Promise<void> {
        try {
            const query = req.query;
            const shops = await ShopService.getAllShops(query);
            BaseController.sendResponse(res, 200, true, 'Shops retrieved successfully', shops);
        } catch (error: any) {
            console.error('Error fetching shops:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);
        }
    }

    static async getShopWorkstations(req: Request<{ shopCode: string }, ApiResponse<Array<Workstation>>>, res: Response): Promise<void> {
        try {
            const { shopCode } = req.params;

            const workstations = await WorkstationService.getWorkstationByShopCode(shopCode)

            BaseController.sendResponse(
                res, 200, true,
                'Workstations retrieved successfully',
                workstations
            );
        } catch (error: any) {
            console.error('Error fetching shop workstations:', error);
            BaseController.sendResponse(res, 500, false, error.message, undefined, error.message);

        }
    }

    static async create(req: Request<ApiResponse<IShop>, CreateShopRequest>, res: Response): Promise<void> {
        try {
            const newShop = await ShopService.createShop(req.body);
            BaseController.sendResponse(res, 201, true, 'Shop created successfully', newShop);
        } catch (error: any) {
            console.error('Error creating shop:', error);

            let statusCode = 500;
            if (error.message.includes('Missing required field') || error.message.includes('Client must be active') || error.message.includes('Maximum number of shops')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already exists')) {
                statusCode = 409;
            } else if (error.message.includes('does not own')) {
                statusCode = 403;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async update(req: Request<{ id: string }, ApiResponse<IShop>, Partial<IShop>>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updatedShop = await ShopService.updateShop(id, req.body);
            BaseController.sendResponse(res, 200, true, 'Shop updated successfully', updatedShop);
        } catch (error: any) {
            console.error('Error updating shop:', error);

            let statusCode = 500;
            if (error.message.includes('Missing required field') || error.message.includes('Invalid')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already exists')) {
                statusCode = 409;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async show(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const shop = await ShopService.getShopById(id);
            BaseController.sendResponse(res, 200, true, 'Shop retrieved successfully', shop);
        } catch (error: any) {
            console.error('Error fetching shop:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }

    static async delete(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await ShopService.deleteShop(id);
            BaseController.sendResponse(res, 200, true, 'Shop deleted successfully', result);
        } catch (error: any) {
            console.error('Error deleting shop:', error);

            let statusCode = 500;
            if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('cannot be deleted')) {
                statusCode = 400;
            }

            BaseController.sendResponse(res, statusCode, false, error.message, undefined, error.message);
        }
    }
}