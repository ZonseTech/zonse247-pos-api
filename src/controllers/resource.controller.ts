import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { ResourceService } from '../services/resource.service';
import { parsePaginationParams } from '../utils/pagination.utils';
import { AuditService, getAuditContext } from '../services/audit.service';

export class ResourceController {
  static listResources = async (req: Request, res: Response) => {
    try {
      const pagination = parsePaginationParams(req.query);
      const auth = (req as any).auth;

      const result = await ResourceService.listResources(
        {
          tenantId: auth.tenantId,
          branchId: auth.activeBranchId || auth.branchId,
        },
        pagination
      );

      BaseController.sendPaginated(res, 'Resources fetched successfully', result.data, result.pagination, 'resources');
    } catch (error) {
      BaseController.sendServerError(res, 'Failed to fetch resources');
    }
  };

  static getResource = async (req: Request, res: Response) => {
    try {
      const resourceId = req.params.resourceId as string;
      const auth = (req as any).auth;

      const resource = await ResourceService.getResourceById(resourceId, {
        tenantId: auth.tenantId,
        branchId: auth.activeBranchId || auth.branchId,
      });

      if (!resource) {
        BaseController.sendNotFound(res, 'Resource not found');
        return;
      }

      BaseController.sendSuccess(res, 'Resource fetched successfully', resource);
    } catch (error) {
      BaseController.sendServerError(res, 'Failed to fetch resource');
    }
  };

  static createResource = async (req: Request, res: Response) => {
    try {
      const { name, type, isAvailable } = req.body;
      const auth = (req as any).auth;

      const resource = await ResourceService.createResource(
        { name: name.trim(), type, isAvailable },
        {
          tenantId: auth.tenantId,
          branchId: auth.activeBranchId || auth.branchId,
        }
      );

      AuditService.logCreate(getAuditContext(req), 'Resource', resource.id, name, { name, type, isAvailable });

      BaseController.sendCreated(res, 'Resource created successfully', resource);
    } catch (error) {
      BaseController.sendServerError(res, 'Failed to create resource');
    }
  };

  static updateResource = async (req: Request, res: Response) => {
    try {
      const resourceId = req.params.resourceId as string;
      const { name, type, isAvailable } = req.body;
      const auth = (req as any).auth;

      await ResourceService.updateResource(
        resourceId,
        { name: name?.trim(), type, isAvailable },
        {
          tenantId: auth.tenantId,
          branchId: auth.activeBranchId || auth.branchId,
        }
      );

      AuditService.logUpdate(getAuditContext(req), 'Resource', resourceId, name || resourceId, undefined, {
        name,
        type,
        isAvailable,
      });

      BaseController.sendSuccess(res, 'Resource updated successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Resource not found or access denied') {
        BaseController.sendNotFound(res, error.message);
        return;
      }
      BaseController.sendServerError(res, 'Failed to update resource');
    }
  };

  static deleteResource = async (req: Request, res: Response) => {
    try {
      const resourceId = req.params.resourceId as string;
      const auth = (req as any).auth;

      await ResourceService.deleteResource(resourceId, {
        tenantId: auth.tenantId,
        branchId: auth.activeBranchId || auth.branchId,
      });

      AuditService.logDelete(getAuditContext(req), 'Resource', resourceId, resourceId);

      BaseController.sendSuccess(res, 'Resource deleted successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Resource not found or access denied') {
        BaseController.sendNotFound(res, error.message);
        return;
      }
      BaseController.sendServerError(res, 'Failed to delete resource');
    }
  };
}
