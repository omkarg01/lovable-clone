import type { Sandbox } from '@e2b/code-interpreter';
import { z } from 'zod';
import { createFile, updateFile, deleteFile, readFile } from '../../tools/index.js';
import path from 'path';
import { getR2File, listFiles } from './r2.js';
import { getSandboxForProjectGeneration } from './sandboxManager.js';
import { waitUntilPreviewReady } from './waitUntilPreviewReady.js';

/** Optional sandbox reuse for follow-up edits (same VM + Vite HMR). */
export type GenerateProjectOptions = {
  existingSandboxId?: string | null;
};


const LLM_URL = 'https://openrouter.ai/api/v1/chat/completions';

/** Max completion tokens for project generate/edit (OpenRouter). Override with OPENROUTER_MAX_TOKENS in .env */
function getOpenRouterMaxTokens(): any {
  const raw = process.env.OPENROUTER_MAX_TOKENS || 3000;
  return raw;
}

// Function to generate a project name from a user query using LLM
export async function suggestProjectName(query: string): Promise<string> {
  if (!query) return 'untitled-project';

  try {
    const response = await fetch(LLM_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a creative naming assistant. Generate a short, catchy, and relevant project name based on the user's description.
            
            RULES:
            1. The name should be 2-3 words max
            2. Use kebab-case format (lowercase with hyphens)
            3. Make it memorable and relevant to the project
            4. Don't include version numbers or dates
            5. If the input is unclear, use a generic but creative name
            
            Examples:
            - "weather app" -> "sky-watcher"
            - "todo list" -> "task-master"
            - "ecommerce site" -> "shop-swift"
            
            Return ONLY the name, nothing else.`
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 1.2,
        max_tokens: 20,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate project name');
    }

    const data = await response.json();
    let name = data.choices?.[0]?.message?.content?.trim() || '';

    // Ensure the name is not empty
    if (!name) throw new Error('Failed to generate project name');

    return name;
  } catch (error) {
    console.error('Error generating project name:', error);
    // Fallback to the simple generator if LLM fails
    return generateProjectName(query);
  }
}

// Fallback function to generate a project name from a user query
function generateProjectName(query: string): string {
  if (!query) return 'untitled-project';

  // Remove special characters and extra spaces, convert to lowercase
  let name = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single one

  // Extract first 3-5 words
  const words = name.split('-').filter(Boolean);
  name = words.slice(0, 5).join('-');

  // Ensure the name is not too long (max 30 chars)
  if (name.length > 30) {
    name = name.substring(0, 30).replace(/-+$/, '');
  }

  // Add a random 4-char alphanumeric suffix for uniqueness
  const suffix = Math.random().toString(36).substring(2, 6);

  return name ? `${name}-${suffix}` : `project-${suffix}`;
}

// Define the system prompt for project generation
const SYSTEM_PROMPT = `You are a helpful assistant that helps create and modify project structures. 
Please provide the project structure and files in the following JSON format:

CRITICAL: Your response MUST be a JSON array starting with [ and ending with ]. DO NOT wrap it in an object with "operations" property.

RESPONSE FORMAT - STRICT REQUIREMENTS:
You MUST return a JSON array directly. Start your response with [ and end with ]. Do NOT wrap it in an object.

CORRECT FORMAT (use this exact structure):
[
  {
    "operation": "createFile",
    "location": "path/to/file",
    "content": "file content here"
  },
  {
    "operation": "updateFile",
    "location": "path/to/another/file",
    "content": "file content here"
  }
]

INCORRECT FORMAT (DO NOT use this):
{
  "operations": [...]
}

Your ENTIRE response MUST be ONLY a JSON array.
- NO prose
- NO explanation
- NO markdown
- NO code fences (no json)
- NO text before or after the array

If you output anything other than a raw JSON array, the system will throw an error.


Your response must start with [ and be a valid JSON array. Any other format will cause errors.

INSTRUCTIONS:
1. Analyze the requirements and determine the appropriate tech stack
2. Generate a complete project structure with all necessary files
3. Include proper configuration files (package.json, .gitignore, etc.)
4. Add clear documentation in README.md
5. Ensure all dependencies are properly specified

FRAMEWORK REQUIREMENTS - ALL PROJECTS USE VITE:
- React projects: MUST use Vite with @vitejs/plugin-react
  - React projects: MUST use Vite with @vitejs/plugin-react
  - REACT VERSION (MANDATORY): Use React 18 or newer ONLY. In package.json dependencies you MUST include BOTH:
    "react": "^18.3.1" and "react-dom": "^18.3.1" (same major version). NEVER use React 16 or 17.
  - Put "vite" and "@vitejs/plugin-react" in devDependencies with modern versions, e.g. "vite": "^5.4.0", "@vitejs/plugin-react": "^4.3.0". Do NOT put @vitejs/plugin-react in dependencies.
  - Entry file src/main.jsx or src/main.tsx MUST use the React 18 API exactly (named import, NOT default):
    import { createRoot } from 'react-dom/client'
    import App from './App.jsx'   // or ./App — match your file extension
    createRoot(document.getElementById('root')).render(<App />)
    FORBIDDEN: import ReactDOM from 'react-dom/client' (there is no default export; Vite will fail).
    FORBIDDEN: React 17 style ReactDOM.render from 'react-dom' if you use createRoot — pick React 18 deps + createRoot, consistently.
  - package.json scripts must include: "dev": "vite --host 0.0.0.0 --port 5175"
  - MUST include vite.config.js with the following configuration:
    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    export default defineConfig({
      plugins: [react()],
      server: {
        host: '0.0.0.0',
        port: 5175,
        allowedHosts: true
      }
    })
  - Generate files matching Vite React template structure
  
- Vue projects: MUST use Vite with @vitejs/plugin-vue
  - package.json scripts must include: "dev": "vite --host 0.0.0.0 --port 5175"
  - MUST include vite.config.js with the following configuration:
    import { defineConfig } from 'vite'
    import vue from '@vitejs/plugin-vue'
    export default defineConfig({
      plugins: [vue()],
      server: {
        host: '0.0.0.0',
        port: 5175,
        allowedHosts: true
      }
    })
  - Generate files matching Vite Vue template structure
  
- Svelte projects: MUST use Vite with @sveltejs/vite-plugin-svelte
  - package.json scripts must include: "dev": "vite --host 0.0.0.0 --port 5175"
  - MUST include vite.config.js with the following configuration:
    import { defineConfig } from 'vite'
    import { svelte } from '@sveltejs/vite-plugin-svelte'
    export default defineConfig({
      plugins: [svelte()],
      server: {
        host: '0.0.0.0',
        port: 5175,
        allowedHosts: true
      }
    })
  - Generate files matching Vite Svelte template structure

- Next.js projects: MUST use Vite (or Vite-based Next.js setup)
  - package.json scripts must include: "dev": "vite --host 0.0.0.0 --port 5175"
  - MUST include vite.config.js with the following configuration:
    import { defineConfig } from 'vite'
    export default defineConfig({
      server: {
        host: '0.0.0.0',
        port: 5175,
        allowedHosts: true
      }
    })
  
- Angular projects: MUST use Vite (or Vite-based Angular setup)
  - package.json scripts must include: "dev": "vite --host 0.0.0.0 --port 5175"
  - MUST include vite.config.js with the following configuration:
    import { defineConfig } from 'vite'
    export default defineConfig({
      server: {
        host: '0.0.0.0',
        port: 5175,
        allowedHosts: true
      }
    })
  
- Nuxt projects: MUST use Nuxt 3 with Vite (Nuxt 3 has native Vite support)
  - package.json scripts must include: "dev": "vite --host 0.0.0.0 --port 5175"
  - MUST include vite.config.js with the following configuration:
    import { defineConfig } from 'vite'
    export default defineConfig({
      server: {
        host: '0.0.0.0',
        port: 5175,
        allowedHosts: true
      }
    })
  
- Remix projects: MUST use Remix with Vite adapter
  - package.json scripts must include: "dev": "vite --host 0.0.0.0 --port 5175"
  - MUST include vite.config.js with the following configuration:
    import { defineConfig } from 'vite'
    export default defineConfig({
      server: {
        host: '0.0.0.0',
        port: 5175,
        allowedHosts: true
      }
    })

CRITICAL RULES:
- DO NOT use Create React App (react-scripts)
- For React + Vite: NEVER output react@17 or react-dom@17 with imports from 'react-dom/client'. react-dom/client requires React 18+.
- DO NOT use Vue CLI (@vue/cli-service)
- DO NOT use framework-specific CLI tools that don't use Vite
- ALL projects MUST use Vite as the build tool
- ALL projects MUST use port 5175
- ALL projects MUST use the dev script: "dev": "vite --host 0.0.0.0 --port 5175"
- ALL projects MUST include a vite.config.js file with server.allowedHosts: true to allow all hosts (required for E2B sandbox environments)

RESPONSE FORMAT:
Return ONLY a JSON array. Start with [ and end with ]. Each element is an operation object with "operation", "location", and optionally "content" fields.

[
  {
    "operation": "createFile",
    "location": "path/to/file",
    "content": "file content here"
  },
  {
    "operation": "updateFile",
    "location": "path/to/another/file",
    "content": "file content here"
  }
]

IMPORTANT:
- Only use the following operations: 'createFile', 'updateFile', 'deleteFile', 'readFile'
- For NEW projects: ONLY use 'createFile' operations - DO NOT use 'readFile', 'updateFile', or 'deleteFile'
- For EXISTING projects: You may use 'readFile' to read existing files before modifying them
- Always include the full path in the 'location' field
- For file content, use proper indentation and formatting
- Include all necessary files for the project to work
- Make sure to include a README.md with setup instructions
`;

// Define TypeScript interfaces for better type safety
interface ProjectFile {
  path: string;
  content: string;
  publicUrl?: string;
  r2Url?: string;
}

interface ProjectGenerationResult {
  success: boolean;
  fileCount: number;
  sandboxId?: string;
  sandboxUrl: string;
  error?: string;
  warning?: string;
  files?: ProjectFile[];
}

// Define the schema for file operations
const fileOperationSchema = z.object({
  operation: z.enum(['createFile', 'updateFile', 'deleteFile', 'readFile', 'error']),
  location: z.string(),
  content: z.string().optional(),
});

type FileOperation = z.infer<typeof fileOperationSchema>;

// Helper function to parse AI responses into file operations
// function parseFileOperations(aiResponse: string): FileOperation[] {
//   if (!aiResponse) {
//     console.error('Empty AI response received');
//     return [{
//       operation: 'createFile',
//       location: 'error.txt',
//       content: 'Error: Empty response received from the AI. Please try again.'
//     }];
//   }

//   // Try to clean the response first
//   let cleanResponse = aiResponse.trim();

//   // Log the first 500 characters of the response for debugging
//   console.log('AI Response (first 500 chars):', cleanResponse.substring(0, 500));

//   try {
//     // Remove markdown code block markers if present
//     if (cleanResponse.startsWith('```')) {
//       // Handle both ```json and ```
//       cleanResponse = cleanResponse
//         .replace(/^```(?:json)?\n?/s, '')  // Remove starting ```json or ```
//         .replace(/\n?```$/s, '');      // Remove ending ```
//     }

//     // Try different parsing strategies
//     const parsingStrategies = [
//       // Strategy 1: Direct JSON parse
//       () => {
//         try {
//           return JSON.parse(cleanResponse);
//         } catch (e) {
//           throw new Error('Direct JSON parse failed');
//         }
//       },

//       // Strategy 2: Extract JSON array
//       () => {
//         const jsonMatch = cleanResponse.match(/\[\s*\{[\s\S]*\}\s*\]/s);
//         if (!jsonMatch) throw new Error('No JSON array found');
//         return JSON.parse(jsonMatch[0]);
//       },

//       // Strategy 3: Extract single JSON object
//       () => {
//         const objMatch = cleanResponse.match(/\{[\s\S]*\}/s);
//         if (!objMatch) throw new Error('No JSON object found');
//         return JSON.parse(objMatch[0]);
//       },

//       // Strategy 4: Try to fix common JSON issues
//       () => {
//         try {
//           // Make a copy of the response for debugging
//           const responseCopy = cleanResponse;

//           // Try to fix common JSON issues like trailing commas, single quotes, etc.
//           let fixedJson = responseCopy
//             // Remove any control characters that might break JSON parsing
//             .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
//             // Fix unescaped quotes within strings
//             .replace(/"([^"]*?)"(?=[:\s\]},])/g, (match) => {
//               // Escape any unescaped quotes within the string
//               return match.replace(/([^\\])"/g, '$1\\"');
//             })
//             // Add quotes around unquoted keys
//             .replace(/([\{\[]\s*)([\w\d_]+)\s*:/g, '$1"$2":')
//             // Replace single quotes with double quotes
//             .replace(/'/g, '"')
//             // Remove trailing commas
//             .replace(/,(\s*[}\]])/g, '$1')
//             // Fix missing commas between objects in arrays
//             .replace(/}\s*{/g, '},{')
//             // Fix missing commas between key-value pairs
//             .replace(/"\s*"([^"])/g, '","$1')
//             // Fix unescaped newlines
//             .replace(/\n/g, '\\n')
//             // Fix unescaped tabs
//             .replace(/\t/g, '\\t');

//           // Try to parse the fixed JSON
//           const result = JSON.parse(fixedJson);

//           // Log success for debugging
//           console.log('Successfully parsed JSON after fixes');
//           return result;
//         } catch (e) {
//           // Log the error and the problematic JSON for debugging
//           console.error('Failed to parse JSON after fixes:', {
//             error: e instanceof Error ? e.message : String(e),
//             originalLength: cleanResponse.length,
//             // Only log a portion to avoid huge logs
//             originalStart: cleanResponse.substring(0, 200),
//             originalEnd: cleanResponse.length > 200
//               ? cleanResponse.substring(cleanResponse.length - 200)
//               : ''
//           });
//           throw new Error('Failed to parse after JSON fixes');
//         }
//       }
//     ];

//     let parsedData: any = null;
//     let lastError: Error | null = null;

//     // Try each strategy until one works
//     for (const strategy of parsingStrategies) {
//       try {
//         parsedData = strategy();
//         if (parsedData) break; // Success, exit the loop
//       } catch (e) {
//         lastError = e instanceof Error ? e : new Error(String(e));
//         continue; // Try next strategy
//       }
//     }

//     if (!parsedData) {
//       throw lastError || new Error('All parsing strategies failed');
//     }

//     // Normalize and validate the parsed data
//     const operations = normalizeFileOperations(parsedData);

//     if (!Array.isArray(operations) || operations.length === 0) {
//       throw new Error('No valid file operations found in the response');
//     }

//     return operations;

//   } catch (error) {
//     const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//     console.error('Error parsing file operations:', {
//       error: errorMessage,
//       stack: error instanceof Error ? error.stack : undefined,
//       input: cleanResponse.length > 500
//         ? cleanResponse.substring(0, 500) + '... (truncated)'
//         : cleanResponse
//     });

//     // Return a helpful error message to the user
//     return [{
//       operation: 'createFile',
//       location: 'error.txt',
//       content: `Error: Failed to parse file operations.\n\n` +
//         `The AI response could not be parsed. Please try again with a different prompt.\n\n` +
//         `Error details: ${errorMessage}\n\n` +
//         `If this issue persists, please contact support.`
//     }];
//   }
// }

function parseFileOperations(aiResponse: string): FileOperation[] {
  if (!aiResponse?.trim()) {
    return [{
      operation: 'createFile',
      location: 'error.txt',
      content: 'Empty AI response'
    }];
  }

  let clean = aiResponse.trim();

  // Remove code fences
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(\w+)?/, "").replace(/```$/, "");
  }

  try {
    const parsed = JSON.parse(clean);
    return normalizeFileOperations(parsed);
  } catch (err) {
    return [{
      operation: 'createFile',
      location: 'error.txt',
      content: `JSON parse error: ${String(err)}`
    }];
  }
}


// Helper function to normalize file operations from different formats
function normalizeFileOperations(parsed: any): FileOperation[] {
  // If the input is a string, try to parse it as JSON
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch (e: any) {
      throw new Error(`Failed to parse string input as JSON: ${e.message}`);
    }
  }

  // Handle wrapper object with 'operations' property (fallback for AI that doesn't follow format)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.operations && Array.isArray(parsed.operations)) {
    parsed = parsed.operations;
  }

  // Must be an array now
  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid input: Expected a JSON array of operations, got ${typeof parsed}`);
  }

  if (parsed.length === 0) {
    throw new Error('Empty operations array');
  }

  // Validate and normalize each operation
  return parsed.map((op, index) => {
    try {
      // Try direct validation first
      return fileOperationSchema.parse(op);
    } catch (e) {
      // If validation fails, try minimal normalization
      if (op && typeof op === 'object') {
        const normalized = {
          operation: op.operation,
          location: op.location || op.path || op.file || op.name,
          content: op.content
        };

        // Validate the normalized operation
        try {
          return fileOperationSchema.parse(normalized);
        } catch (validationError) {
          throw new Error(
            `Invalid operation at index ${index}: ${validationError instanceof Error ? validationError.message : String(validationError)}`
          );
        }
      }
      throw new Error(`Invalid operation at index ${index}: Expected an object with 'operation' and 'location' properties`);
    }
  });
}

// Function to execute file operations in the sandbox
async function executeFileOperations(
  operations: FileOperation[],
  projectId: string,
  projectName: string = 'untitled-project',
  sandbox: Sandbox
): Promise<{ files: ProjectFile[]; errors: string[] }> {
  const files: ProjectFile[] = [];
  const errors: string[] = [];
  // R2 PATH
  const projectRoot = `projects/${projectId}/${projectName}`;
  // Sandbox VM path


  // Log the operations we're about to perform
  console.log('Executing file operations:', {
    operationCount: operations.length,
    operations: operations.map(op => ({
      operation: op.operation,
      location: op.location,
      contentLength: op.content ? op.content.length : 0
    }))
  });

  for (const op of operations) {
    try {
      // Skip operations with empty or invalid paths
      if (!op.location || typeof op.location !== 'string' || op.location.trim() === '') {
        errors.push(`Skipping ${op.operation}: Invalid location '${op.location}'`);
        continue;
      }

      let fullPath = op.location.replace(/^\/+/, '');
      // If the path doesn't start with the project name, prepend it
      if (!fullPath.startsWith(projectName)) {
        fullPath = `${projectRoot}/${fullPath}`;
      } else {
        fullPath = `projects/${projectId}/${fullPath}`;
      }
      fullPath = fullPath.replace(/\/\//g, '/');

      switch (op.operation) {
        case 'createFile':
          if (!op.location || op.content === undefined) {
            errors.push(`Invalid createFile operation: ${JSON.stringify(op)}`);
            continue;
          }

          try {
            // ✅ Write file to sandbox
            // const fullVMPath = path.posix.join('/home/user', op.location);
            // const dirPath = path.posix.dirname(fullVMPath);
            // await ensureDirectoryExists(sandbox, dirPath);
            // await sandbox.files.write(fullVMPath, op.content);
            // console.log(`✅ [Sandbox] Created file: ${fullVMPath}`);

            // ✅ Create file in R2
            const createResult = await createFile.execute({
              location: fullPath,
              content: op.content
            });

            if (createResult.success) {
              files.push({
                path: op.location,
                content: op.content,
                publicUrl: createResult.url || '',
                r2Url: createResult.r2Url || ''
              });
              console.log(`Created file: ${op.location}`);
            } else {
              errors.push(`Failed to create file ${op.location}: ${createResult.message}`);
            }
          } catch (error: any) {
            errors.push(`Error creating file ${op.location}: ${error.message}`);
          }
          break;

        case 'updateFile':
          if (!op.location || op.content === undefined) {
            errors.push(`Invalid updateFile operation: ${JSON.stringify(op)}`);
            continue;
          }

          try {
            // ✅ Update file in sandbox
            // const fullVMPath = path.posix.join('/home/user', op.location);
            // const dirPath = path.posix.dirname(fullVMPath);
            // await ensureDirectoryExists(sandbox, dirPath);
            // await sandbox.files.write(fullVMPath, op.content);
            // console.log(`✅ [Sandbox] Updated file: ${fullVMPath}`);

            // ✅ Update file in R2
            const updateResult = await updateFile.execute({
              location: fullPath,
              content: op.content
            });

            if (updateResult.success) {
              files.push({
                path: op.location,
                content: op.content,
                publicUrl: updateResult.url || '',
                r2Url: updateResult.r2Url || ''
              });
              console.log(`Updated file: ${op.location}`);
            } else {
              errors.push(`Failed to update file ${op.location}: ${updateResult.message}`);
            }
          } catch (error: any) {
            errors.push(`Error updating file ${op.location}: ${error.message}`);
          }
          break;

        case 'deleteFile':
          if (!op.location) {
            errors.push(`Invalid deleteFile operation: ${JSON.stringify(op)}`);
            continue;
          }

          try {

            // ✅ Delete from sandbox
            // const fullVMPath = path.posix.join('/home/user', op.location);
            // const dirPath = path.posix.dirname(fullVMPath);
            // await ensureDirectoryExists(sandbox, dirPath);
            // await sandbox.files.remove(fullVMPath);
            // console.log(`✅ [Sandbox] Deleted file: ${fullVMPath}`);

            // ✅ Delete from R2
            const deleteResult = await deleteFile.execute({
              location: fullPath
            });

            if (!deleteResult.success) {
              errors.push(`Failed to delete file ${op.location}: ${deleteResult.message}`);
            } else {
              console.log(`Deleted file: ${op.location}`);
            }
          } catch (error: any) {
            errors.push(`Error deleting file ${op.location}: ${error.message}`);
          }
          break;

        case 'readFile':
          if (!op.location) {
            errors.push(`Invalid readFile operation: ${JSON.stringify(op)}`);
            continue;
          }

          try {
            // ✅ Read from sandbox
            // const fullVMPath = path.posix.join('/home/user', op.location);
            // const dirPath = path.posix.dirname(fullVMPath);
            // await ensureDirectoryExists(sandbox, dirPath);
            // await sandbox.files.read(fullVMPath);
            // console.log(`✅ [Sandbox] Read file: ${fullVMPath}`);

            // ✅ Read from R2
            const readFileResult = await readFile.execute({
              location: fullPath
            });

            if (readFileResult.success) {
              files.push({
                path: op.location,
                content: readFileResult.content || '',
                publicUrl: '',
                r2Url: ''
              });
              console.log(`Read file: ${op.location}`);
            } else {
              errors.push(`Failed to read file ${op.location}: ${readFileResult.message}`);
            }
          } catch (error: any) {
            errors.push(`Error reading file ${op.location}: ${error.message}`);
          }
          break;

        default:
          const errorMsg = `Unknown operation: '${(op as any).operation}' for '${op.location}'`;
          console.error(errorMsg);
          errors.push(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = `Unexpected error processing ${op.operation} '${op.location}': ${error.message}`;
      console.error(errorMsg, error);
      errors.push(errorMsg);
    }
  }

  return { files, errors };
}

export async function generateAndUploadProjectFiles(
  projectId: string,
  prompt: string,
  projectName?: string,
  isNewProject: boolean = false,
  options?: GenerateProjectOptions
): Promise<ProjectGenerationResult> {
  let sandbox: any = null;

  try {
    const name = projectName || 'untitled-project';

    // If it's a new project and we have a project name, update the prompt to include it
    let processedPrompt = prompt;
    if (isNewProject && projectName) {
      processedPrompt = `Create a new project named "${projectName}" with the following requirements:\n\n${prompt}`;
    }

    const resolution = await getSandboxForProjectGeneration({
      projectId,
      projectName: name,
      existingSandboxId: options?.existingSandboxId,
      isNewProject,
    });
    sandbox = resolution.sandbox;
    const { reused: sandboxReused, restoredFromR2 } = resolution;

    console.log('projectName', name, { sandboxReused, restoredFromR2, sandboxId: resolution.sandboxId });
    const projectDir = `/home/user/${name}`;
    await sandbox.commands.run(`mkdir -p "${projectDir}"`);
    const startupDelayMs = sandboxReused || restoredFromR2 ? 500 : 5000;
    await new Promise(resolve => setTimeout(resolve, startupDelayMs));

    // Generate project structure using AI
    const response = await fetch(LLM_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: isNewProject
              ? `Create a new project with the following requirements:\n\n${processedPrompt}\n\n` +
              `Please provide the project structure and files in JSON format as specified in the system prompt.`
              : `Modify the existing project with the following requirements:\n\n${processedPrompt}\n\n` +
              `Please provide the updated project structure and files in JSON format as specified in the system prompt.`
          }
        ],
        temperature: 0.7,
        max_tokens: getOpenRouterMaxTokens(),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${error}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';

    // Parse the AI response into file operations
    const operations = parseFileOperations(aiResponse);

    if (operations.length === 0) {
      throw new Error('Failed to generate project structure. No valid file operations found in the AI response.');
    }

    // Filter out readFile operations for new projects
    const filteredOperations = operations.filter(op => {
      if (isNewProject) {
        return op.operation !== 'readFile';
      }
      return true; // For existing projects, allow all operations
    });

    // Execute file operations
    const { files, errors } = await executeFileOperations(filteredOperations, projectId, name, sandbox);

    // After file operations, add a small delay
    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay

    // get the content and file path call r2
    const r2filenames = await listFiles(projectId);
    console.log("r2filenames", r2filenames);

    // create a array of files with path and content use getR2File
    const projectFiles: ProjectFile[] = await Promise.all(
      r2filenames.map(async (file) => ({
        path: file,
        content: await getR2File(path.posix.join("projects", projectId, file)), // join for linux
      }))
    );
    console.log("projectFiles", projectFiles);

    // write files to sandbox
    for (const file of projectFiles) {
      await sandbox.files.write(`/home/user/${file.path}`, file.content);
      console.log(`✅ [Sandbox] Wrote file: ${file.path}`);
    }


    const allFiles = await sandbox.files.list(projectDir, { recursive: true });
    // console.log('📁 Sandbox files:', allFiles);

    // Read package.json to detect project type
    const packageJson = await sandbox.files.read(`/home/user/${name}/package.json`);
    // console.log('Package.json:', packageJson);

    // All projects use Vite as base config
    const devConfig = {
      command: 'npm run dev',
      port: 5175,
      projectType: 'vite'
    };

    // Get the host URL using the detected port
    const host = sandbox.getHost(devConfig.port);
    const sandboxUrl = `https://${host}`;
    const sandboxId = sandbox.sandboxId;
    console.log('Sandbox URL:', sandboxUrl);
    console.log('Sandbox ID:', sandboxId);

    // Build the command with proper environment variables
    let envVars: Record<string, string> = {
      SKIP_PREFLIGHT_CHECK: "true"
    };

    // All projects use Vite, which handles host/port via command flags
    // No framework-specific environment variables needed

    const skipNpmBootstrap = sandboxReused || restoredFromR2;
    if (!skipNpmBootstrap) {
      const fullCommand = `cd /home/user/${name} && npm install && ${devConfig.command}`;
      console.log(`Running command: ${fullCommand}`);

      await sandbox.commands.run(fullCommand, {
        timeoutMs: 0,
        background: true,
        onStdout: (data: any) => {
          console.log('stdout:', data);
        },
        onStderr: (data: any) => {
          console.error('stderr:', data);
        },
        env: envVars
      });

      await waitUntilPreviewReady(sandboxUrl);
    } else {
      console.log('[generateAndUploadProjectFiles] Skipping npm install / dev (reused or R2-restored sandbox; Vite already running)');
    }

    // const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Start a background task to close the sandbox after 2 minutes
    // (async () => {
    //   await delay(120000); // 2 minutes in milliseconds

    //   try {
    //     console.log('Auto-terminating sandbox...');
    //     await sandbox.close();
    //     console.log('Sandbox terminated successfully');
    //   } catch (error) {
    //     console.error('Error terminating sandbox:', error);
    //   }
    // })();

    // if (files.length === 0) {
    //   throw new Error('Failed to create any files. ' + (errors[0] || 'Unknown error'));
    // }

    // if (errors.length > 0) {
    //   console.warn('Some operations had errors:', errors);
    // }


    return {
      success: true,
      fileCount: files.length,
      sandboxId,
      sandboxUrl,
      files,
      ...(errors.length > 0 && { warning: `Some operations had errors: ${errors.join('; ')}` })
    };

  } catch (error: any) {
    console.error('Error in generateAndUploadProjectFiles:', error);
    return {
      success: false,
      fileCount: 0,
      sandboxUrl: '',
      error: error.message || 'Unknown error occurred during project generation'
    };
  } finally {
    // CRITICAL: Do NOT close sandbox - we need to keep it alive for future use
    // The sandbox will be managed through sandboxId for reconnection
    // if (sandbox && typeof sandbox.close === 'function') {
    //   try {
    //     await sandbox.close();
    //   } catch (e) {
    //     console.error('Error closing sandbox:', e);
    //   }
    // }
  }
}


export const formatFileContent = (files: Array<{ path: string; content: string }>) => {
  return files.map(file => `File: ${file.path}\nContent:\n${file.content}\n`).join('\n');
};