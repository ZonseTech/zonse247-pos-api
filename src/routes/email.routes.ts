import { Router } from "express";
import { EmailController } from "../controllers/email.controller";

const router = Router();

router.get('/test-email', EmailController.testEmail);
router.get('/health/email', EmailController.checkEmailHealth);

export default router;