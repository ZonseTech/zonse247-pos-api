import { Router } from 'express';
import { LoyaltyController } from '../controllers/loyalty.controller';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { loyaltySchemas } from '../validations/loyalty.schemas';

const router = Router();

// ── Program ──────────────────────────────────────────────────────
router.get('/program', LoyaltyController.getProgram);
router.post('/program', validateBody(loyaltySchemas.createProgram), LoyaltyController.createProgram);
router.put(
  '/program/:programId',
  validateParams(loyaltySchemas.programIdParam),
  validateBody(loyaltySchemas.updateProgram),
  LoyaltyController.updateProgram
);

// ── Tiers ────────────────────────────────────────────────────────
router.get('/program/:programId/tiers', validateParams(loyaltySchemas.programIdParam), LoyaltyController.getTiers);
router.post(
  '/program/:programId/tiers',
  validateParams(loyaltySchemas.programIdParam),
  validateBody(loyaltySchemas.createTier),
  LoyaltyController.createTier
);
router.put(
  '/tiers/:tierId',
  validateParams(loyaltySchemas.tierIdParam),
  validateBody(loyaltySchemas.updateTier),
  LoyaltyController.updateTier
);
router.delete('/tiers/:tierId', validateParams(loyaltySchemas.tierIdParam), LoyaltyController.deleteTier);

// ── Members ──────────────────────────────────────────────────────
router.post('/members', validateBody(loyaltySchemas.enrollMember), LoyaltyController.enrollMember);
router.get('/members/:memberId', validateParams(loyaltySchemas.memberIdParam), LoyaltyController.getMember);
router.get(
  '/members/:memberId/dashboard',
  validateParams(loyaltySchemas.memberIdParam),
  LoyaltyController.getMemberDashboard
);
router.get(
  '/customers/:customerId/membership',
  validateParams(loyaltySchemas.customerIdParam),
  LoyaltyController.getMemberByCustomer
);
router.get(
  '/program/:programId/members',
  validateParams(loyaltySchemas.programIdParam),
  validateQuery(loyaltySchemas.listQuery),
  LoyaltyController.listMembers
);

// ── Points Operations ────────────────────────────────────────────
router.get(
  '/members/:memberId/redeem/preview',
  validateParams(loyaltySchemas.memberIdParam),
  LoyaltyController.calculateRedemption
);
router.post(
  '/members/:memberId/redeem',
  validateParams(loyaltySchemas.memberIdParam),
  validateBody(loyaltySchemas.redeemPoints),
  LoyaltyController.redeemPoints
);
router.post(
  '/members/:memberId/adjust',
  validateParams(loyaltySchemas.memberIdParam),
  validateBody(loyaltySchemas.adjustPoints),
  LoyaltyController.adjustPoints
);

// ── Transactions ─────────────────────────────────────────────────
router.get(
  '/members/:memberId/transactions',
  validateParams(loyaltySchemas.memberIdParam),
  validateQuery(loyaltySchemas.listQuery),
  LoyaltyController.getTransactions
);

export default router;
