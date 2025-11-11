import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// ✅ Serve backend API routes
import backend from "./backend/index.js"; // or your backend main file
app.use("/api", backend);

// ✅ Serve Next.js frontend
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev, dir: "./frontend" });
const handle = nextApp.getRequestHandler();

await nextApp.prepare();
app.all("*", (req, res) => handle(req, res));

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server ready on port ${port}`);
});
