import type { Response } from 'express';
class ApiResponses {
    static ok<T>(res: Response, message: string, data: T) {
        return res.status(200).json({
            success: true,
            message,
            data
        });
    }
    static create<T>(res: Response, message: string, data: T) {
        return res.status(201).json({
            success: true,
            message,
            data
        });
    }
}
export default ApiResponses;
