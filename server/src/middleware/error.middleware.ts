import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";

const logError = (error: unknown, req?: Request) => {
    const method = req?.method ?? "UNKNOWN_METHOD";
    const url = req?.originalUrl ?? "UNKNOWN_URL";

    if (error instanceof Error) {
        console.error(`[${new Date().toISOString()}] ${method} ${url}`);
        console.error(error.stack ?? error.message);
        return;
    }

    console.error(`[${new Date().toISOString()}] ${method} ${url}`);
    console.error(error);
};

export const errorMiddleware = (
    error: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    logError(error, req);

    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            message: error.message
        });
    }

    return res.status(500).json({
        message: "Internal server error"
    });
};

export { logError };
