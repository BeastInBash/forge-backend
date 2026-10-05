export interface FieldError {
    field: string;
    message: string;
}

class ApiError extends Error {
    public statusCode: number;
    public errors?: FieldError[];
    constructor(statusCode: number, message: string, errors?: FieldError[]) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.errors = errors;
        Error.captureStackTrace(this, this.constructor);
    }
    static badRequest(message = 'Bad Request', errors?: FieldError[]) {
        return new ApiError(400, message, errors);
    }
    static unauthorized(message = 'Unauthorized') {
        return new ApiError(401, message);
    }
    static forbidden(message = 'Forbidden') {
        return new ApiError(403, message);
    }
    static notFound(message = 'Not Found') {
        return new ApiError(404, message);
    }
    static conflict(message = 'Conflict') {
        return new ApiError(409, message);
    }
}
export default ApiError;
