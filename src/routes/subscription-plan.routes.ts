import { Router } from 'express';
import { SubscriptionPlanController } from '../controllers/subscription-plan.controller';

const router = Router();

/**
 * GET /
 * List all subscription plans
 */
router.get('/', SubscriptionPlanController.list);

/**
 * GET /active
 * Get only active subscription plans (isActive = true)
 */
router.get('/active', SubscriptionPlanController.getActive);

/**
 * GET /:id
 * Get a specific subscription plan by ID
 * @param {string} id - Subscription plan UUID
 */
router.get('/:id', SubscriptionPlanController.show);

/**
 * POST /
 * Create a new subscription plan
 * @body {string} planCode - Unique plan code (required)
 * @body {string} name - Plan name (required)
 * @body {string} [description] - Plan description
 * @body {number} [monthlyPrice=0] - Monthly price
 * @body {number} [yearlyPrice=0] - Yearly price
 * @body {string} [color=gray] - Display color
 * @body {boolean} [isPopular=false] - Mark as popular plan
 * @body {boolean} [isActive=true] - Plan availability
 * @body {object} features - Plan features (required, JSON)
 * @body {object} limits - Plan limits (required, JSON)
 * @body {string} [notes] - Additional notes
 */
router.post('/', SubscriptionPlanController.store);

/**
 * PUT /:id
 * Update an existing subscription plan
 * @param {string} id - Subscription plan UUID
 */
router.put('/:id', SubscriptionPlanController.update);

/**
 * DELETE /:id
 * Delete a subscription plan
 * @param {string} id - Subscription plan UUID
 */
router.delete('/:id', SubscriptionPlanController.delete);

/**
 * PATCH /:id/toggle-status
 * Toggle the active status of a subscription plan
 * @param {string} id - Subscription plan UUID
 */
router.patch('/:id/toggle-status', SubscriptionPlanController.toggleStatus);

/**
 * GET /:id/validate
 * Validate a subscription plan (check if active and properly configured)
 * @param {string} id - Subscription plan UUID
 */
router.get('/:id/validate', SubscriptionPlanController.validatePlan);

export default router;