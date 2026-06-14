import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { createServer } from "http";
import authRoutes from "./routes/auth.routes";
import learnRoutes from "./routes/learn.routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { globalRateLimit, authRateLimit } from "./middlewares/rateLimit.middleware";
import { initSocket } from "./sockets/index";

const app = express();
const httpServer = createServer(app);

initSocket(httpServer);

app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
}));

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(globalRateLimit);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ishaara-api", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRateLimit, authRoutes);
app.use("/api/learn", learnRoutes);
app.use(errorMiddleware);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.info(`Ishaara API running on port ${PORT}`);
});

export { app, httpServer };
