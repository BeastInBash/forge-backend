import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { getProfile } from '../controllers/profile.controller';

const profileRouter = Router();

profileRouter.get('/', requireAuth, asyncHandler(getProfile));
export default profileRouter;
