import type { Response } from "express"
class ApiResponses {
    static ok(res: Response, message: string, data = null) {
        return res.status(200).json({
            success: true,
            message,
            data
        })
    }
    static create(res: Response, message: string, data = null) {
        return res.status(200).json({
            success: true,
            message,
            data
        })
    }
}
