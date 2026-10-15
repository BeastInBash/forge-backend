import type { Request, Response } from 'express';
import { sendWaterRemindersService } from '../services/water.services';
import { checkPushReceiptsService } from '../services/push.services';
import ApiResponses from '../../common/libs/ApiResponses';

export const runWaterReminders = async (_req: Request, res: Response) => {
    const reminders = await sendWaterRemindersService();
    const receipts = await checkPushReceiptsService();
    return ApiResponses.ok(res, 'Water reminders run', { reminders, receipts });
};
