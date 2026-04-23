import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { ServiceCatalogService } from '../services/service-catalog.service';
import { parsePaginationParams } from '../utils/pagination.utils';

export class ServiceCatalogController extends BaseController {
  static getAuth(req: Request) {
    const auth = (req as any).auth;
    return {
      tenantId: auth.tenantId,
      branchId: auth.activeBranchId || auth.branchId,
    };
  }

  static async createService(req: Request, res: Response) {
    try {
      const { tenantId, branchId } = ServiceCatalogController.getAuth(req);
      const service = await ServiceCatalogService.createService(req.body, tenantId, branchId);

      BaseController.sendResponse(res, 201, true, 'Service created successfully', service);
    } catch (error) {
      const msg = (error as Error).message;
      const status = msg.includes('already exists') ? 409 : 400;
      BaseController.sendResponse(res, status, false, 'Failed to create service', undefined, msg);
    }
  }

  static async listServices(req: Request, res: Response) {
    try {
      const { tenantId, branchId } = ServiceCatalogController.getAuth(req);
      const pagination = parsePaginationParams(req.query);
      const { search, categoryId, isActive, pricingType } = req.query;

      const result = await ServiceCatalogService.listServices(
        tenantId,
        branchId,
        {
          search: search as string | undefined,
          categoryId: categoryId as string | undefined,
          isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
          pricingType: pricingType as string | undefined,
        },
        pagination
      );

      BaseController.sendPaginated(res, 'Services fetched successfully', result.data, result.pagination, 'services');
    } catch (error) {
      BaseController.sendResponse(res, 500, false, 'Failed to list services', undefined, (error as Error).message);
    }
  }

  static async getService(req: Request, res: Response) {
    try {
      const { tenantId, branchId } = ServiceCatalogController.getAuth(req);
      const id = req.params.id as string;

      const service = await ServiceCatalogService.getServiceById(id, tenantId, branchId);

      if (!service) {
        BaseController.sendResponse(res, 404, false, 'Service not found');
        return;
      }

      BaseController.sendResponse(res, 200, true, 'Service retrieved successfully', service);
    } catch (error) {
      BaseController.sendResponse(res, 400, false, 'Failed to get service', undefined, (error as Error).message);
    }
  }

  static async updateService(req: Request, res: Response) {
    try {
      const { tenantId, branchId } = ServiceCatalogController.getAuth(req);
      const id = req.params.id as string;

      const service = await ServiceCatalogService.updateService(id, tenantId, branchId, req.body);

      BaseController.sendResponse(res, 200, true, 'Service updated successfully', service);
    } catch (error) {
      const msg = (error as Error).message;
      const status = msg === 'Service not found' ? 404 : msg.includes('already exists') ? 409 : 400;
      BaseController.sendResponse(res, status, false, 'Failed to update service', undefined, msg);
    }
  }

  static async getSummary(req: Request, res: Response) {
    try {
      const { tenantId, branchId } = ServiceCatalogController.getAuth(req);
      const { search, categoryId, isActive, pricingType } = req.query;

      const summary = await ServiceCatalogService.getSummary(tenantId, branchId, {
        search: search as string | undefined,
        categoryId: categoryId as string | undefined,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        pricingType: pricingType as string | undefined,
      });

      BaseController.sendResponse(res, 200, true, 'Service catalog summary', summary);
    } catch (error) {
      BaseController.sendResponse(res, 500, false, 'Failed to get service summary', undefined, (error as Error).message);
    }
  }

  static async deleteService(req: Request, res: Response) {
    try {
      const { tenantId, branchId } = ServiceCatalogController.getAuth(req);
      const id = req.params.id as string;

      await ServiceCatalogService.deleteService(id, tenantId, branchId);

      BaseController.sendResponse(res, 200, true, 'Service deleted successfully');
    } catch (error) {
      const status = (error as Error).message === 'Service not found' ? 404 : 400;
      BaseController.sendResponse(res, status, false, 'Failed to delete service', undefined, (error as Error).message);
    }
  }
}
