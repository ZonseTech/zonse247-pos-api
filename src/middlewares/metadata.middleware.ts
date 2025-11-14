import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from 'src/lib/express.type';

export class MetadataMiddleware {

    /**
     * Verify verification key and required params
     */
    static async validateKey(req: Request & AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const {
                verificationKey,
                tenantId,
                branchId,
                terminalId
            } = req.body;

            const missingParams: Array<string> = [];

            if (!tenantId) missingParams.push('tenantId');
            if (!branchId) missingParams.push('branchId');
            if (!terminalId) missingParams.push('terminalId');
            if (!verificationKey) missingParams.push('verificationKey');

            if (missingParams.length > 0) {
                res.status(400).json({
                    success: false,
                    message: `Missing required parameters: ${missingParams.join(', ')}`,
                    error: 'PARAMETER_VALIDATION_ERROR'
                });
                return;
            }

            const tenantStr = tenantId.toString();
            const branchStr = branchId.toString();
            const keyStr = verificationKey.toString();
            const terminalStr = terminalId.toString();

            const isValidKey = await MetadataMiddleware.validateVerificationKey(keyStr, tenantStr, branchStr, terminalStr);

            if (!isValidKey) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid verification key',
                    error: 'INVALID_VERIFICATION_KEY'
                });
                return;
            }

            req.verifiedMetadata = {
                verificationKey: keyStr,
                tenantId: tenantStr,
                branchId: branchStr,
                terminalId: terminalStr
            };

            next();
        } catch (error: any) {
            console.error('Error in verification middleware:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during verification',
                error: 'VERIFICATION_ERROR'
            });
        }
    }

    /**
     * Verification key validation
     */
    private static async validateVerificationKey(
        verificationKey: string,
        tenantId: string,
        branchId: string,
        terminalId: string
    ): Promise<boolean> {
        try {
            if (!verificationKey.trim() || !tenantId.trim() || !branchId.trim() || !terminalId.trim()) {
                return false;
            }

            return await this.checkKeyValidity(verificationKey, tenantId, branchId, terminalId);
        } catch (error) {
            console.error('Error validating verification key:', error);
            return false;
        }
    }

    /**
     * Check key validity - replace with your actual logic
     */
    private static async checkKeyValidity(
        verificationKey: string,
        tenantId: string,
        branchId: string,
        terminalId: string
    ): Promise<boolean> {
        // TODO: Implement actual verification logic
        // const isValid = await VerificationModel.isValidKey(verificationKey, tenantId, branchId, terminalId);
        // return isValid;

        console.log(`Verifying key: ${verificationKey} for tenant: ${tenantId}, branch: ${branchId}, terminal: ${terminalId}`);
        return true;
    }
}