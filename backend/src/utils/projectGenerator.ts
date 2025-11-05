import { Sandbox } from '@e2b/code-interpreter';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import { createFile, updateFile, deleteFile, readFile } from '../../tools';


const LLM_URL = 'https://openrouter.ai/api/v1/chat/completions';

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

{
  "operations": [
    {
      "operation": "createFile" | "updateFile" | "deleteFile" | "readFile",
      "location": "path/to/file",
      "content": "file content"  // Not needed for deleteFile
    }
  ]
}

INSTRUCTIONS:
1. Analyze the requirements and determine the appropriate tech stack
2. Generate a complete project structure with all necessary files
3. Include proper configuration files (package.json, .gitignore, etc.)
4. Add clear documentation in README.md
5. Ensure all dependencies are properly specified

RESPONSE FORMAT:
Return a JSON array of file operations. Each operation should be an object with the following structure:

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
- Always include the full path in the 'location' field
- For file content, use proper indentation and formatting
- Include all necessary files for the project to work
- Make sure to include a README.md with setup instructions`;

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
function parseFileOperations(aiResponse: string): FileOperation[] {
  if (!aiResponse) {
    console.error('Empty AI response received');
    return [{
      operation: 'createFile',
      location: 'error.txt',
      content: 'Error: Empty response received from the AI. Please try again.'
    }];
  }

  // Try to clean the response first
  let cleanResponse = aiResponse.trim();

  // Log the first 500 characters of the response for debugging
  console.log('AI Response (first 500 chars):', cleanResponse.substring(0, 500));

  try {
    // Remove markdown code block markers if present
    if (cleanResponse.startsWith('```')) {
      // Handle both ```json and ```
      cleanResponse = cleanResponse
        .replace(/^```(?:json)?\n?/s, '')  // Remove starting ```json or ```
        .replace(/\n?```$/s, '');      // Remove ending ```
    }

    // Try different parsing strategies
    const parsingStrategies = [
      // Strategy 1: Direct JSON parse
      () => {
        try {
          return JSON.parse(cleanResponse);
        } catch (e) {
          throw new Error('Direct JSON parse failed');
        }
      },

      // Strategy 2: Extract JSON array
      () => {
        const jsonMatch = cleanResponse.match(/\[\s*\{[\s\S]*\}\s*\]/s);
        if (!jsonMatch) throw new Error('No JSON array found');
        return JSON.parse(jsonMatch[0]);
      },

      // Strategy 3: Extract single JSON object
      () => {
        const objMatch = cleanResponse.match(/\{[\s\S]*\}/s);
        if (!objMatch) throw new Error('No JSON object found');
        return JSON.parse(objMatch[0]);
      },

      // Strategy 4: Try to fix common JSON issues
      () => {
        try {
          // Make a copy of the response for debugging
          const responseCopy = cleanResponse;

          // Try to fix common JSON issues like trailing commas, single quotes, etc.
          let fixedJson = responseCopy
            // Remove any control characters that might break JSON parsing
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
            // Fix unescaped quotes within strings
            .replace(/"([^"]*?)"(?=[:\s\]},])/g, (match) => {
              // Escape any unescaped quotes within the string
              return match.replace(/([^\\])"/g, '$1\\"');
            })
            // Add quotes around unquoted keys
            .replace(/([\{\[]\s*)([\w\d_]+)\s*:/g, '$1"$2":')
            // Replace single quotes with double quotes
            .replace(/'/g, '"')
            // Remove trailing commas
            .replace(/,(\s*[}\]])/g, '$1')
            // Fix missing commas between objects in arrays
            .replace(/}\s*{/g, '},{')
            // Fix missing commas between key-value pairs
            .replace(/"\s*"([^"])/g, '","$1')
            // Fix unescaped newlines
            .replace(/\n/g, '\\n')
            // Fix unescaped tabs
            .replace(/\t/g, '\\t');

          // Try to parse the fixed JSON
          const result = JSON.parse(fixedJson);

          // Log success for debugging
          console.log('Successfully parsed JSON after fixes');
          return result;
        } catch (e) {
          // Log the error and the problematic JSON for debugging
          console.error('Failed to parse JSON after fixes:', {
            error: e instanceof Error ? e.message : String(e),
            originalLength: cleanResponse.length,
            // Only log a portion to avoid huge logs
            originalStart: cleanResponse.substring(0, 200),
            originalEnd: cleanResponse.length > 200
              ? cleanResponse.substring(cleanResponse.length - 200)
              : ''
          });
          throw new Error('Failed to parse after JSON fixes');
        }
      }
    ];

    let parsedData: any = null;
    let lastError: Error | null = null;

    // Try each strategy until one works
    for (const strategy of parsingStrategies) {
      try {
        parsedData = strategy();
        if (parsedData) break; // Success, exit the loop
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        continue; // Try next strategy
      }
    }

    if (!parsedData) {
      throw lastError || new Error('All parsing strategies failed');
    }

    // Normalize and validate the parsed data
    const operations = normalizeFileOperations(parsedData);

    if (!Array.isArray(operations) || operations.length === 0) {
      throw new Error('No valid file operations found in the response');
    }

    return operations;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error parsing file operations:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      input: cleanResponse.length > 500
        ? cleanResponse.substring(0, 500) + '... (truncated)'
        : cleanResponse
    });

    // Return a helpful error message to the user
    return [{
      operation: 'createFile',
      location: 'error.txt',
      content: `Error: Failed to parse file operations.\n\n` +
        `The AI response could not be parsed. Please try again with a different prompt.\n\n` +
        `Error details: ${errorMessage}\n\n` +
        `If this issue persists, please contact support.`
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

  // Helper function to validate and normalize a single operation
  const normalizeOperation = (op: any, index: number): FileOperation => {
    // If it's already a valid operation, return it
    try {
      return fileOperationSchema.parse(op);
    } catch (e) {
      // If validation fails and it's an object, try to normalize it
      if (op && typeof op === 'object') {
        // Try to determine the operation type
        let operation = 'readFile';
        if (op.operation && ['createFile', 'updateFile', 'deleteFile', 'readFile', 'error'].includes(op.operation)) {
          operation = op.operation;
        } else if (op.type) {
          // Try to map common type names to operations
          const typeMap: Record<string, string> = {
            'create': 'createFile',
            'update': 'updateFile',
            'delete': 'deleteFile',
            'read': 'readFile',
            'error': 'error'
          };
          operation = typeMap[op.type.toLowerCase()] || 'readFile';
        }

        // Normalize the location/path
        let location = op.path || op.location || op.file || op.name || `file${index}.txt`;

        // Ensure location is a string and doesn't contain any directory traversal
        location = String(location).replace(/\.\.\//g, '').replace(/\/\//g, '/');

        // Normalize content
        let content: string | undefined;
        if (op.content !== undefined) {
          if (typeof op.content === 'string') {
            content = op.content;
          } else if (op.content && typeof op.content === 'object') {
            try {
              content = JSON.stringify(op.content, null, 2);
            } catch (e) {
              content = String(op.content);
            }
          } else {
            content = String(op.content);
          }
        }

        // Create the normalized operation
        const normalized = {
          operation,
          location,
          content
        };

        try {
          return fileOperationSchema.parse(normalized);
        } catch (validationError) {
          console.warn('Failed to validate normalized operation:', {
            original: op,
            normalized,
            error: validationError instanceof Error ? validationError.message : String(validationError)
          });
          throw new Error(`Invalid operation format at index ${index}: ${validationError instanceof Error ? validationError.message : String(validationError)}`);
        }
      }

      // If we get here, we couldn't normalize the operation
      throw new Error(`Invalid operation format at index ${index}: Expected an object with 'operation' and 'location' properties`);
    }
  };

  try {
    // Handle array of operations
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        throw new Error('Empty operations array');
      }
      return parsed.map((item, index) => {
        try {
          return normalizeOperation(item, index);
        } catch (e) {
          console.error(`Error normalizing operation at index ${index}:`, e);
          throw e;
        }
      });
    }

    // Handle single operation object
    if (parsed && typeof parsed === 'object') {
      return [normalizeOperation(parsed, 0)];
    }

    throw new Error(`Invalid input type: ${typeof parsed}. Expected an array of operations or a single operation object`);
  } catch (error) {
    console.error('Error in normalizeFileOperations:', {
      error: error instanceof Error ? error.message : String(error),
      input: parsed
    });
    throw error; // Re-throw to be handled by the caller
  }
}

// Helper function to normalize file paths
function normalizePath(path: string): string {
  // Replace backslashes with forward slashes and remove any leading/trailing slashes
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

// Function to execute file operations in the sandbox
async function executeFileOperations(
  operations: FileOperation[],
  projectId: string,
  projectName: string = 'untitled-project'
): Promise<{ files: ProjectFile[]; errors: string[] }> {
  const files: ProjectFile[] = [];
  const errors: string[] = [];
  const projectRoot = `projects/${projectId}/${projectName}`;

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
  isNewProject: boolean = false
): Promise<ProjectGenerationResult> {
  let sandbox: any = null;

  try {
    // If it's a new project and we have a project name, update the prompt to include it
    let processedPrompt = prompt;
    if (isNewProject && projectName) {
      processedPrompt = `Create a new project named "${projectName}" with the following requirements:\n\n${prompt}`;
    }

    // Create E2B sandbox
    sandbox = await Sandbox.create('f9osur8wx7gur0n4hja6');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const host = sandbox.getHost(5173);
    const sandboxUrl = `https://${host}`;
    console.log('Sandbox URL:', sandboxUrl);

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
        max_tokens: 4000,
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

    // Execute file operations
    const { files, errors } = await executeFileOperations(operations, projectId, projectName);

    if (files.length === 0) {
      throw new Error('Failed to create any files. ' + (errors[0] || 'Unknown error'));
    }

    if (errors.length > 0) {
      console.warn('Some operations had errors:', errors);
    }

    return {
      success: true,
      fileCount: files.length,
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
    // Clean up sandbox
    if (sandbox && typeof sandbox.close === 'function') {
      try {
        await sandbox.close();
      } catch (e) {
        console.error('Error closing sandbox:', e);
      }
    }
  }
}
