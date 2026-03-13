import { UserModel } from '../models/user.model';
import { AuthRequest } from '../lib/express.type';
import { BranchModel } from '../models/branch.model';
import { BranchSubscriptionModel } from '../models/branch-subscription.model';
import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../controllers/base.controller';

/**
 * Branch Middleware
 * Handles branch context switching and validation for multi-branch operations
 */
export class BranchMiddleware {

    /**
     * Validates and sets the active branch context from request header
     * Allows users to switch branches via X-Branch-Id header
     * 
     * @remarks
     * - If X-Branch-Id header is provided, validates user has access to that branch
     * - Falls back to user's currentBranchId or default branchId from token
     * - Updates req.auth with the active branch context
     */
    static validateBranchAccess = async (
        req: Request & AuthRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const user = req.auth;

            if (!user) {
                BaseController.sendResponse(res, 401, false, 'Authentication required');
                return;
            }

            const requestedBranchId = req.headers['x-branch-id'] as string | undefined;

            if (!requestedBranchId) {
                req.auth = {
                    ...user,
                    activeBranchId: user.currentBranchId || user.branchId
                };
                next();
                return;
            }

            const hasAccess = await BranchMiddleware.userHasBranchAccess(user, requestedBranchId);

            if (!hasAccess) {
                BaseController.sendResponse(
                    res,
                    403,
                    false,
                    'You do not have access to this branch'
                );
                return;
            }

            const branch = await BranchModel.findById(requestedBranchId);

            if (!branch) {
                BaseController.sendResponse(res, 404, false, 'Branch not found');
                return;
            }

            if (branch.tenantId !== user.tenantId) {
                BaseController.sendResponse(
                    res,
                    403,
                    false,
                    'You do not have access to this branch'
                );
                return;
            }

            if (branch.status !== 'active') {
                BaseController.sendResponse(
                    res,
                    403,
                    false,
                    'The requested branch is not active'
                );
                return;
            }

            await UserModel.updateCurrentBranch(user.userId, requestedBranchId);

            req.auth = {
                ...user,
                activeBranchId: requestedBranchId,
                activeBranch: branch
            };

            res.setHeader('X-Active-Branch-Id', requestedBranchId);

            next();
        } catch (error) {
            console.error('Error in branch access middleware:', error);
            BaseController.sendResponse(
                res,
                500,
                false,
                'Error validating branch access'
            );
        }
    };

    /**
     * Checks if a user has access to a specific branch
     * 
     * @param user - The authenticated user object
     * @param branchId - The branch ID to check access for
     * @returns Promise<boolean> - True if user has access, false otherwise
     */
    static async userHasBranchAccess(user: any, branchId: string): Promise<boolean> {
        if (user?.accessibleBranches &&
            Array.isArray(user.accessibleBranches) &&
            user.accessibleBranches.includes('*')) {
            return true;
        }

        if (user?.branchId === branchId) {
            return true;
        }

        if (user?.accessibleBranches &&
            Array.isArray(user.accessibleBranches) &&
            user.accessibleBranches.includes(branchId)) {
            return true;
        }

        return false;
    }

    /**
     * Middleware that requires a specific branch to be set
     * Use for routes that must operate on a specific branch context
     */
    static requireBranchContext = (
        req: Request & AuthRequest,
        res: Response,
        next: NextFunction
    ): void => {
        const user = req.auth;

        if (!user) {
            BaseController.sendResponse(res, 401, false, 'Authentication required');
            return;
        }

        const activeBranchId = (user)?.activeBranchId || user.currentBranchId || user.branchId;

        if (!activeBranchId) {
            BaseController.sendResponse(
                res,
                400,
                false,
                'Branch context is required. Please provide X-Branch-Id header or set a default branch.'
            );
            return;
        }

        next();
    };

    /**
     * Gets the effective branch ID for the current request
     * Utility function to use in controllers
     */
    static getEffectiveBranchId(req: Request & AuthRequest): string {
        const user = req.auth;
        return (user)?.activeBranchId || user?.currentBranchId || user?.branchId || '';
    }

    /**
     * Validates branch subscription status
     * Checks if branch has a valid subscription plan linked to an active branch subscription
     */
    validateBranchSubscription = async (
        req: Request & AuthRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const user = req.auth;
            const branchId = user?.currentBranchId || user?.branchId || '';

            // Get branch with subscription details
            const branchWithRelations = await BranchModel.findByIdWithRelations(branchId);

            if (!branchWithRelations) {
                BaseController.sendForbiddenWithSubscription(
                    res,
                    'No branch found for subscription check.',
                    'inactive'
                );
                return;
            }

            const { branch, branchSubscription } = branchWithRelations;

            if (!branch.branchSubscriptionId || !branchSubscription) {
                BaseController.sendForbiddenWithSubscription(
                    res,
                    'No subscription assigned to this branch. Please contact support.',
                    'inactive'
                );
                return;
            }

            if (branchSubscription.status !== 'active') {
                BaseController.sendForbiddenWithSubscription(
                    res,
                    'Your branch subscription is not active. Please subscribe to continue using the service.',
                    branchSubscription.status || 'inactive'
                );
                return;
            }

            if (branchSubscription.endsAt) {
                const now = new Date();
                const endsAt = new Date(branchSubscription.endsAt);

                if (endsAt < now) {
                    // Auto-update subscription status to expired in database
                    await BranchSubscriptionModel.update(branchSubscription.branchSubscriptionId, {
                        status: 'expired'
                    });

                    BaseController.sendForbiddenWithSubscription(
                        res,
                        'Your subscription has expired. Please renew to continue using the service.',
                        'expired',
                        { subscriptionEndsAt: branchSubscription.endsAt }
                    );
                    return;
                }

                const daysRemaining = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (daysRemaining <= 7) {
                    res.setHeader('X-Subscription-Warning', 'true');
                    res.setHeader('X-Subscription-Days-Remaining', daysRemaining.toString());
                }
            }

            next();
        } catch (error) {
            BaseController.sendServerErrorWithSubscription(
                res,
                'Subscription validation error:',
                error instanceof Error ? error.message : 'Internal server error'
            );
        }
    };
}
