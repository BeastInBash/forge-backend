import type { Request, Response } from 'express';
import {
    createWaterLogService,
    deleteWaterLogService,
    getWaterDayService,
    getWaterGoalService,
    setWaterGoalService
} from '../services/water.services';
import ApiResponses from '../../common/libs/ApiResponses';
import {
    waterDayQuerySchema,
    type WaterGoalBody,
    type WaterLogBody,
    type WaterLogIdParams
} from '../../common/zodSchema/waterSchema';

export const getWaterGoal = async (_req: Request, res: Response) => {
    const data = await getWaterGoalService(res.locals.session.session.userId);
    return ApiResponses.ok(res, 'Water goal', data);
};

export const setWaterGoal = async (req: Request, res: Response) => {
    // req.body was validated by validateBody(waterGoalBodySchema)
    const data = await setWaterGoalService(
        req.body as WaterGoalBody,
        res.locals.session.session.userId
    );
    return ApiResponses.ok(res, 'Water goal saved', data);
};

export const getWaterDay = async (req: Request, res: Response) => {
    // req.query can't be reassigned in Express 5, so it is parsed here; a ZodError becomes a 400
    const query = waterDayQuerySchema.parse(req.query);
    const data = await getWaterDayService(res.locals.session.session.userId, query);
    return ApiResponses.ok(res, 'Water intake', data);
};

export const createWaterLog = async (req: Request, res: Response) => {
    // req.body was validated by validateBody(waterLogBodySchema)
    const data = await createWaterLogService(
        req.body as WaterLogBody,
        res.locals.session.session.userId
    );
    return ApiResponses.create(res, 'Water logged', data);
};

export const deleteWaterLog = async (req: Request, res: Response) => {
    const { logId } = req.params as WaterLogIdParams;
    await deleteWaterLogService(logId, res.locals.session.session.userId);
    return ApiResponses.ok(res, 'Water log deleted', null);
};
