import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { DistrictService } from '../services/district.service';
import { AuthRequest } from '../lib/express.type';
import { UpdateDistrictDto } from 'district';
import { parsePaginationParams } from '../utils/pagination.utils';
import { AuditService, getAuditContext } from '../services/audit.service';

export class DistrictController extends BaseController {
    /**
     * Get all districts
     * GET /districts/all
     */
    static getAllDistricts = async (req: Request & AuthRequest, res: Response): Promise<void> => {
        try {
            const { region, isActive } = req.query;

            const filters: any = {};
            if (region && typeof region === 'string') {
                filters.region = region;
            }
            if (isActive !== undefined) {
                filters.isActive = isActive === 'true';
            }

            const pagination = parsePaginationParams(req.query);
            const result = await DistrictService.listDistricts(filters, pagination);
            BaseController.sendPaginated(res, 'Districts fetched successfully', result.data, result.pagination, 'districts');
        } catch (error) {
            console.error('Error in getAllDistricts:', error);
            DistrictController.sendResponse(res, 500, false, 'Failed to fetch districts', undefined, 'Internal Server Error');
        }
    };

    /**
     * Get districts grouped by region
     * GET /districts/by-region
     */
    static getDistrictsByRegion = async (req: Request & AuthRequest, res: Response): Promise<void> => {
        try {
            const districtsByRegion = await DistrictService.getDistrictsByRegion();
            DistrictController.sendResponse(res, 200, true, 'Districts fetched successfully', districtsByRegion);
        } catch (error) {
            console.error('Error in getDistrictsByRegion:', error);
            DistrictController.sendResponse(res, 500, false, 'Failed to fetch districts by region', undefined, 'Internal Server Error');
        }
    };

    /**
     * Get a district by ID
     * GET /districts/:districtId
     */
    static getDistrictById = async (req: Request & AuthRequest, res: Response): Promise<void> => {
        try {
            const districtId = req.params.districtId as string;

            if (!districtId) {
                DistrictController.sendResponse(res, 400, false, 'District ID is required', undefined, 'Bad Request');
                return;
            }

            const district = await DistrictService.getDistrictById(districtId);

            if (!district) {
                DistrictController.sendResponse(res, 404, false, 'District not found', undefined, 'Not Found');
                return;
            }

            DistrictController.sendResponse(res, 200, true, 'District fetched successfully', district);
        } catch (error) {
            console.error('Error in getDistrictById:', error);
            DistrictController.sendResponse(res, 500, false, 'Failed to fetch district', undefined, 'Internal Server Error');
        }
    };

    /**
     * Update a district
     * PUT /districts/:districtId
     */
    static updateDistrict = async (req: Request & AuthRequest, res: Response): Promise<void> => {
        try {
            const districtId = req.params.districtId as string;
            const { name, region, code, isActive } = req.body;

            if (!districtId) {
                DistrictController.sendResponse(res, 400, false, 'District ID is required', undefined, 'Bad Request');
                return;
            }

            const updateData: UpdateDistrictDto = {};

            if (name !== undefined) {
                if (typeof name !== 'string' || name.trim().length === 0) {
                    DistrictController.sendResponse(res, 400, false, 'District name must be a non-empty string', undefined, 'Bad Request');
                    return;
                }
                updateData.name = name.trim();
            }

            if (region !== undefined) {
                if (typeof region !== 'string' || !['Northern', 'Central', 'Southern'].includes(region)) {
                    DistrictController.sendResponse(res, 400, false, 'Region must be one of: Northern, Central, Southern', undefined, 'Bad Request');
                    return;
                }
                updateData.region = region;
            }

            if (code !== undefined) {
                if (typeof code !== 'string' || code.trim().length === 0) {
                    DistrictController.sendResponse(res, 400, false, 'District code must be a non-empty string', undefined, 'Bad Request');
                    return;
                }
                updateData.code = code.trim().toUpperCase();
            }

            if (isActive !== undefined) {
                updateData.isActive = Boolean(isActive);
            }

            const updatedDistrict = await DistrictService.updateDistrict(districtId, updateData);

            AuditService.logUpdate(getAuditContext(req), 'District', districtId, updateData.name || districtId, undefined, updateData as any);

            DistrictController.sendResponse(res, 200, true, 'District updated successfully', updatedDistrict);
        } catch (error: any) {
            console.error('Error in updateDistrict:', error);

            if (error.message === 'District not found') {
                DistrictController.sendResponse(res, 404, false, 'District not found', undefined, 'Not Found');
                return;
            }

            if (error.message === 'District code already exists') {
                DistrictController.sendResponse(res, 409, false, 'District code already exists', undefined, 'Conflict');
                return;
            }

            DistrictController.sendResponse(res, 500, false, 'Failed to update district', undefined, 'Internal Server Error');
        }
    };

    /**
     * Get districts in a specific region
     * GET /districts/region/:region
     */
    static getDistrictsInRegion = async (req: Request & AuthRequest, res: Response): Promise<void> => {
        try {
            const region = req.params.region as string;

            if (!region || !['Northern', 'Central', 'Southern'].includes(region)) {
                DistrictController.sendResponse(res, 400, false, 'Valid region is required (Northern, Central, Southern)', undefined, 'Bad Request');
                return;
            }

            const districts = await DistrictService.getDistrictsInRegion(region);
            DistrictController.sendResponse(res, 200, true, `Districts in ${region} region fetched successfully`, districts);
        } catch (error) {
            console.error('Error in getDistrictsInRegion:', error);
            DistrictController.sendResponse(res, 500, false, 'Failed to fetch districts in region', undefined, 'Internal Server Error');
        }
    };
}
