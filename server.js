import dotenv from 'dotenv';
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import next from "next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the root directory
// dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const app = express();
console.log("CLOUDFLARE_BUCKET:", process.env.CLOUDFLARE_BUCKET);

const port = process.env.PORT || 3000;

// ----------------------------
// 1️⃣ BACKEND (Express API first)
// ----------------------------
import backend from "./backend/dist/index.js";
app.use("/api", backend);

// ----------------------------
// 2️⃣ FRONTEND (Next.js second)
// ----------------------------
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev, dir: "./frontend" });
const handle = nextApp.getRequestHandler();

await nextApp.prepare();

// // Next.js catch-all — MUST BE LAST
app.all("*", (req, res) => handle(req, res));

// // ----------------------------
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server ready on port ${port}`);
});
