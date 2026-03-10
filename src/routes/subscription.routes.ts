import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';

const router = Router();

/**
 * GET /
 * List all branch subscriptions with optional filtering
 * @query {string} [status] - Filter by status: active, cancelled, expired, past_due
 * @query {string} [planId] - Filter by subscription plan UUID
 */
router.get('/', SubscriptionController.list);

/**
 * GET /stats
 * Get subscription statistics (total, active, cancelled, expired, revenue)
 */
router.get('/stats', SubscriptionController.getStats);

/**
 * GET /expiring
 * Get subscriptions expiring within specified days
 * @query {number} [days=30] - Number of days to look ahead (1-365)
 */
router.get('/expiring', SubscriptionController.getExpiring);

/**
 * GET /current
 * Get subscription for the current active branch (from auth context)
 * Uses activeBranchId > currentBranchId > branchId from auth token
 */
router.get('/current', SubscriptionController.getCurrentBranchSubscription);

/**
 * GET /:id
 * Get a specific subscription by ID
 * @param {string} id - Branch subscription UUID
 */
router.get('/:id', SubscriptionController.show);

/**
 * POST /
 * Create a new branch subscription
 * @body {string} subscriptionPlanId - Subscription plan UUID (required)
 * @body {number} [subscriptionMonths] - Duration in months
 * @body {boolean} [autoRenew=true] - Auto-renewal setting
 * @body {string} [paymentMethod] - Payment method identifier
 */
router.post('/', SubscriptionController.store);

/**
 * PUT /:id
 * Update an existing subscription
 * @param {string} id - Branch subscription UUID
 */
router.put('/:id', SubscriptionController.update);

/**
 * DELETE /:id
 * Delete a subscription
 * @param {string} id - Branch subscription UUID
 */
router.delete('/:id', SubscriptionController.delete);

/**
 * POST /:id/cancel
 * Cancel a subscription (sets status to cancelled, ends immediately)
 * @param {string} id - Branch subscription UUID
 */
router.post('/:id/cancel', SubscriptionController.cancel);

/**
 * POST /:id/reactivate
 * Reactivate a cancelled or expired subscription
 * @param {string} id - Branch subscription UUID
 */
router.post('/:id/reactivate', SubscriptionController.reactivate);

/**
 * POST /:id/process-payment
 * Process a payment for a subscription
 * @param {string} id - Branch subscription UUID
 * @body {number} amount - Payment amount (required, > 0)
 * @body {string} paymentMethod - Payment method identifier (required)
 */
router.post('/:id/process-payment', SubscriptionController.processPayment);

/**
 * PATCH /bulk-update
 * Bulk update multiple subscriptions
 * @body {string[]} ids - Array of branch subscription UUIDs (required)
 * @body {object} data - Update data to apply to all subscriptions
 */
router.patch('/bulk-update', SubscriptionController.bulkUpdate);

export default router;