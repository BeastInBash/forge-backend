import type { Request, Response } from 'express';
import {
    createLiftService,
    deleteLiftService,
    listExerciseLiftsService,
    listLiftSummariesService
} from '../services/lift.services';
import ApiResponses from '../../common/libs/ApiResponses';
import type {
    LiftBodyInput,
    LiftExerciseParams,
    LiftIdParams
} from '../../common/zodSchema/liftSchema';

export const listLiftSummaries = async (_req: Request, res: Response) => {
    const data = await listLiftSummariesService(res.locals.session.session.userId);
    return ApiResponses.ok(res, 'Lift summaries', data);
};

export const listExerciseLifts = async (req: Request, res: Response) => {
    const { exerciseId } = req.params as LiftExerciseParams;
    const data = await listExerciseLiftsService(res.locals.session.session.userId, exerciseId);
    return ApiResponses.ok(res, 'Lift history', data);
};

export const createLift = async (req: Request, res: Response) => {
    // req.body was validated by validateBody(liftBodySchema)
    const data = await createLiftService(
        req.body as LiftBodyInput,
        res.locals.session.session.userId
    );
    return ApiResponses.create(res, 'Lift logged', data);
};

export const deleteLift = async (req: Request, res: Response) => {
    const { liftId } = req.params as LiftIdParams;
    await deleteLiftService(liftId, res.locals.session.session.userId);
    return ApiResponses.ok(res, 'Lift deleted', null);
};
