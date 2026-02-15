import { Router } from 'express';
import { DistrictController } from '../controllers/district.controller';

const router = Router();

// GET /districts - Get all districts with optional filters
router.get('/', DistrictController.getAllDistricts);

// GET /districts/by-region - Get districts grouped by region
router.get('/by-region', DistrictController.getDistrictsByRegion);

// GET /districts/region/:region - Get districts in a specific region
router.get('/region/:region', DistrictController.getDistrictsInRegion);

// GET /districts/:districtId - Get a single district by ID
router.get('/:districtId', DistrictController.getDistrictById);

// PUT /districts/:districtId - Update a district
router.put('/:districtId', DistrictController.updateDistrict);

export default router;
