import { Router } from 'express';
import { requireCronSecret } from '../../common/middleware/auth.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { runWaterReminders } from '../controllers/cron.controller';

/** Called by the scheduler, not the app. GET because that is what Vercel Cron sends. */
const cronRouter = Router();

cronRouter.get('/water-reminders', requireCronSecret, asyncHandler(runWaterReminders));
export default cronRouter;
