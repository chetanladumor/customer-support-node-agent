import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

import { errorHandler } from "./middleware/errorHandler.js";
import { createRateLimiter } from "./middleware/rateLimiter.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import healthRoutes from "./routes/health.routes.js";
import agentRoutes from "./routes/agent.routes.js";
import userRoutes from "./routes/user.routes.js";
import chatRoutes from "./routes/chat.routes.js";

const app = express();

// ---------------------------------------------------------------------------
// Global Middlewares
// ---------------------------------------------------------------------------

// Security headers (adds X-Content-Type-Options, X-Frame-Options, etc.)
app.use(helmet());

// Request logging (logs method, url, status, response time)
app.use(morgan("dev"));

// Parse JSON request bodies (replaces Hono's c.req.json())
app.use(express.json());

// CORS configuration (replaces Hono's cors() middleware)
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-User-Id"],
  })
);

// Rate Limiting — 100 requests per minute per IP on all /api/* routes
app.use("/api", createRateLimiter({ maxRequests: 100, windowMs: 60 * 1000 }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use("/api", healthRoutes);
app.use("/api", agentRoutes);
app.use("/api", userRoutes);

// Chat routes require the user to be authenticated
app.use("/api", authMiddleware, chatRoutes);

// ---------------------------------------------------------------------------
// Global Error Handler (must be registered LAST)
// ---------------------------------------------------------------------------
app.use(errorHandler);

export { app };
