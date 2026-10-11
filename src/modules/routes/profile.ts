import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware';
import { validateBody } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { onboardingBodySchema } from '../../common/zodSchema/profileSchema';
import { deleteAccount, getProfile, saveOnboarding } from '../controllers/profile.controller';

const profileRouter = Router();

profileRouter.get('/', requireAuth, asyncHandler(getProfile));

// Permanently deletes the signed-in user and everything they own.
profileRouter.delete('/', requireAuth, asyncHandler(deleteAccount));

profileRouter.put(
    '/onboarding',
    requireAuth,
    validateBody(onboardingBodySchema),
    asyncHandler(saveOnboarding)
);
export default profileRouter;
