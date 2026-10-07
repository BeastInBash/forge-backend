import type { Request, Response } from 'express';
import { getProfileService } from '../services/profile.services';
import ApiResponses from '../../common/libs/ApiResponses';

export const getProfile = async (_req: Request, res: Response) => {
    const { session } = res.locals.session;
    const data = await getProfileService(session.userId, session.id);
    return ApiResponses.ok(res, 'Profile', data);
};
