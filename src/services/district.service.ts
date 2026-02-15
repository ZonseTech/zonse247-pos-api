import { District, DistrictFilters, UpdateDistrictDto } from 'district';
import { DistrictModel } from '../models/district.model';

export class DistrictService {
    /**
     * Get all districts with optional filters
     */
    static async getAllDistricts(filters?: DistrictFilters): Promise<District[]> {
        try {
            return await DistrictModel.findAll(filters);
        } catch (error) {
            console.error('Error fetching districts:', error);
            throw new Error('Failed to fetch districts');
        }
    }

    /**
     * Get districts grouped by region
     */
    static async getDistrictsByRegion(): Promise<Record<string, District[]>> {
        try {
            const districts = await DistrictModel.findAll({ isActive: true });

            return districts.reduce((acc, district) => {
                if (!acc[district.region]) {
                    acc[district.region] = [];
                }
                acc[district.region].push(district);
                return acc;
            }, {} as Record<string, District[]>);
        } catch (error) {
            console.error('Error fetching districts by region:', error);
            throw new Error('Failed to fetch districts by region');
        }
    }

    /**
     * Get district by ID
     */
    static async getDistrictById(districtId: string): Promise<District | null> {
        try {
            return await DistrictModel.findById(districtId);
        } catch (error) {
            console.error('Error fetching district:', error);
            throw new Error('Failed to fetch district');
        }
    }

    /**
     * Get district by code
     */
    static async getDistrictByCode(code: string): Promise<District | null> {
        try {
            return await DistrictModel.findByCode(code);
        } catch (error) {
            console.error('Error fetching district by code:', error);
            throw new Error('Failed to fetch district by code');
        }
    }

    /**
     * Get districts in a specific region
     */
    static async getDistrictsInRegion(region: string): Promise<District[]> {
        try {
            return await DistrictModel.findByRegion(region);
        } catch (error) {
            console.error('Error fetching districts in region:', error);
            throw new Error('Failed to fetch districts in region');
        }
    }

    /**
     * Update a district
     */
    static async updateDistrict(districtId: string, data: UpdateDistrictDto): Promise<District> {
        try {
            // Check if district exists
            const exists = await DistrictModel.exists(districtId);
            if (!exists) {
                throw new Error('District not found');
            }

            // Check for duplicate code if code is being updated
            if (data.code) {
                const existingByCode = await DistrictModel.findByCode(data.code);
                if (existingByCode && existingByCode.districtId !== districtId) {
                    throw new Error('District code already exists');
                }
            }

            return await DistrictModel.update(districtId, data);
        } catch (error) {
            console.error('Error updating district:', error);
            throw error;
        }
    }

    /**
     * Get district count
     */
    static async getDistrictCount(filters?: DistrictFilters): Promise<number> {
        try {
            return await DistrictModel.count(filters);
        } catch (error) {
            console.error('Error counting districts:', error);
            throw new Error('Failed to count districts');
        }
    }

    /**
     * Check if district exists
     */
    static async districtExists(districtId: string): Promise<boolean> {
        return await DistrictModel.exists(districtId);
    }
}
