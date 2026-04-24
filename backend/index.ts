import dotenv from 'dotenv';
// dotenv.config();
// const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (process.env.NODE_ENV === 'development') {
    dotenv.config();
} else {
    dotenv.config({ path: '/etc/secrets/env.text' });
}
import express from "express";
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import { SYSTEM_PROMPT } from "./prompt.js";
import { createFile, updateFile, deleteFile, readFile } from "./tools/index.js";
import { Sandbox } from '@e2b/code-interpreter'
import cors from 'cors';
import authRoutes from './src/routes/auth.routes.js';
import projectRoutes from './src/routes/project.routes.js';
// import { loadEnv } from "./src/config/index.js";

// export const env = loadEnv();
const app = express();

// console.log("CLOUDFLARE_BUCKET:", process.env.CLOUDFLARE_BUCKET);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/test-auth", (req, res) => {
  res.json({ working: true });
});
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);

// Health check endpoint
app.get("/", (req, res) => {
    res.json({
        message: "Server is running",
        endpoints: {
            auth: {
                signup: "POST /api/auth/signup",
                signin: "POST /api/auth/signin"
            },
            postPrompt: "POST /api/prompt",
            project: {
                create: "POST /api/project",
                get: "GET /api/project/:projectId"
            },
            
            projects: {
                get: "GET /api/projects"
            }
        }
    });
});

app.post("/api/prompt", async (req, res) => {
    try {
        const { prompt } = req.body;

        // Create E2B sandbox (Vite starts automatically via start_cmd in e2b.toml)
        const sandbox = await Sandbox.create('f9osur8wx7gur0n4hja6')

        // Wait for Vite server to be ready
        await new Promise(resolve => setTimeout(resolve, 5000))

        const host = sandbox.getHost(5173)
        const sandboxUrl = `https://${host}`
        console.log('Sandbox URL:', sandboxUrl)

        const openrouter = createOpenRouter({
            apiKey: process.env.OPENROUTER_API_KEY,
        });



        const response = streamText({
            model: openrouter("gpt-4o-mini"),
            tools: {
                createFile: createFile,
                updateFile: updateFile,
                deleteFile: deleteFile,
                readFile: readFile
            },
            messages: [
                {
                    role: "system",
                    content: SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content: prompt
                }
            ]
        });

        response.pipeTextStreamToResponse(res);


        // ✅ Collect full text manually
        let fullText = "";
        for await (const delta of response.textStream) {
            fullText += delta;
        }

        // ✅ Upload the final response text to R2
        // const timestamp = Date.now();
        // await uploadToR2(`responses/${timestamp}.txt`, fullText);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }

});

// const PORT = process.env.PORT || 3001;

// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });

export default app;