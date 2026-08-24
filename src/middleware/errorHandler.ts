import type { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// Custom API Error (Replaces Hono's HTTPException)
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  statusCode: number;
  details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Express Error Middleware
// ---------------------------------------------------------------------------
// In Express, error handling middleware MUST have exactly 4 arguments:
// (err, req, res, next)
// This is how Express distinguishes it from regular middleware.
// ---------------------------------------------------------------------------
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("❌ [ErrorHandler]:", err);

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        name: err.name,
        message: err.message,
        statusCode: err.statusCode,
        details: err.details,
      },
    });
    return;
  }

  // Catch-all for unexpected standard Errors
  res.status(500).json({
    success: false,
    error: {
      name: "InternalServerError",
      message: err.message || "An unexpected error occurred on the server.",
      statusCode: 500,
    },
  });
}
