import type { Request, Response } from 'express';
import { getProfileService, saveOnboardingService } from '../services/profile.services';
import ApiResponses from '../../common/libs/ApiResponses';
import type { OnboardingBodyInput } from '../../common/zodSchema/profileSchema';

export const getProfile = async (_req: Request, res: Response) => {
    const { session } = res.locals.session;
    const data = await getProfileService(session.userId, session.id);
    return ApiResponses.ok(res, 'Profile', data);
};

export const saveOnboarding = async (req: Request, res: Response) => {
    // req.body was validated by validateBody(onboardingBodySchema)
    const data = await saveOnboardingService(
        res.locals.session.session.userId,
        req.body as OnboardingBodyInput
    );
    return ApiResponses.ok(res, 'Onboarding saved', data);
};
