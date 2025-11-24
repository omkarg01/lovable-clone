import { Request, Response } from 'express';
import z, { ZodIssue } from 'zod';

import { createProjectSchema, type CreateProjectInput } from '../validations/project.validation.js';
import prisma from '../lib/prisma.js';
import { formatFileContent, generateAndUploadProjectFiles, suggestProjectName } from '../utils/projectGenerator.js';
import { getR2File, listFiles } from '../utils/r2.js';

interface MessageData {
    content: string;
    [key: string]: any;
}
// Extend Express Request type to include user
type AuthenticatedRequest = Request & { user?: { id: string } };

/**
 * Create a new project
 * Route: POST /api/projects
 * @param req - request object
 * @param res - response object
 * @returns The created project
 */
export const createProject = async (req: Request, res: Response) => {
    try {
        // Validate input using Zod schema
        const validationResult = createProjectSchema.safeParse(req.body);

        if (!validationResult.success) {
            const errorMessages = validationResult.error.issues.map((issue: ZodIssue) => ({
                field: issue.path.join('.'),
                message: issue.message
            }));
            return res.status(400).json({
                error: 'Validation failed',
                details: errorMessages
            });
        }

        // Get user ID from the authenticated request
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { initialPrompt } = validationResult.data;
        const userQuery = initialPrompt;

        const projectName = await suggestProjectName(userQuery);
        // console.log("projectName", projectName);

        // First create the project
        const project = await prisma.project.create({
            data: {
                title: projectName,
                userId
            },
        });

        let assistantResponse = '';
        let generatedFiles = [];
        let result = null;

        // Generate and upload files using LLM
        try {
            result = await generateAndUploadProjectFiles(project.id, userQuery, projectName, true);

            console.log("result", result);
            if (result.success) {
                assistantResponse = `Successfully generated ${result.fileCount} files. `;
                if (result.files) {
                    assistantResponse += `Files created: ${result.files.map(f => f.path).join(', ')}`;
                    generatedFiles = result.files;
                }
                
                // Store sandbox info in database
                if (result.sandboxId && result.sandboxUrl) {
                    try {
                        await prisma.project.update({
                            where: { id: project.id },
                            data: {
                                sandboxId: result.sandboxId,
                                sandboxUrl: result.sandboxUrl,
                                sandboxStatus: 'active'
                            } as any
                        });
                        console.log(`[createProject] Stored sandbox info for project ${project.id}:`, {
                            projectId: project.id,
                            sandboxId: result.sandboxId,
                            sandboxUrl: result.sandboxUrl
                        });
                    } catch (dbError) {
                        console.error('[createProject] Error storing sandbox info in database:', dbError);
                    }
                }
            } else {
                assistantResponse = 'Failed to generate project files. ' + (result.error || 'Unknown error');
                console.error('[createProject] Project generation failed:', result.error);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            assistantResponse = `Error during project generation: ${errorMessage}`;
            console.error('[createProject] Error in project generation:', error);
        }

        try {
            await prisma.chat.create({
                data: {
                    projectId: project.id,
                    messages: {
                        create: [{
                            role: 'user',
                            data: {
                                content: userQuery
                            },
                            assistantResponses: {
                                create: [{
                                    role: 'assistant',
                                    data: {
                                        content: assistantResponse
                                    }
                                }]
                            }
                        }]
                    }
                }
            });
        } catch (error) {
            console.error('Failed to create conversation:', error);
            // Continue even if conversation creation fails
        }

        res.status(201).json({
            message: 'Project created successfully',
            project,
            filesGenerated: generatedFiles.length,
            assistantResponse,
            sandboxUrl: result?.sandboxUrl,
            links: {
                view: `/api/projects/${project.id}`,
                files: `/api/projects/${project.id}/files`
            }
        });
    } catch (error: unknown) {
        console.error('Error creating project:', error);
        res.status(500).json({
            error: 'An error occurred while creating the project',
            details: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};

/**
 * Get all projects for the authenticated user
 * Route: GET /api/projects
 * @param req - request object
 * @param res - response object
 * @returns The projects for the authenticated user
 */
export const getProjects = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const projects = await prisma.project.findMany({
            where: { userId },
            select: {
                id: true,
                title: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        return res.status(200).json({ projects });
    } catch (error) {
        console.error('Error fetching projects:', error);
        return res.status(500).json({ error: 'Failed to fetch projects' });
    }
};

/**
 * Get a project for the authenticated user
 * Route: GET /api/projects/:projectId
 * @param req - projectId
 * @param res - response object
 * @returns The project for the authenticated user
 */
export const getProject = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        // 1. Get project metadata from database
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                userId // Ensure the user owns the project
            }
        }) as any;

        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found or access denied'
            });
        }

        // 2. Get or recreate sandbox
        let sandboxUrl = project.sandboxUrl;
        let sandboxStatus = project.sandboxStatus || 'active';
        let sandboxId = project.sandboxId;

        try {
            const { getOrRecreateSandbox } = await import('../utils/sandboxManager.js');
            const sandboxInfo = await getOrRecreateSandbox(projectId, project.title);
            sandboxUrl = sandboxInfo.sandboxUrl;
            sandboxId = sandboxInfo.sandboxId;
            sandboxStatus = 'active';

            // Update database if sandbox was recreated or status changed
            if (sandboxId !== project.sandboxId || sandboxUrl !== project.sandboxUrl) {
                await prisma.project.update({
                    where: { id: projectId },
                    data: {
                        sandboxId: sandboxId,
                        sandboxUrl: sandboxUrl,
                        sandboxStatus: sandboxStatus
                    } as any
                });
                console.log(`[getProject] Updated project ${projectId} with new sandbox info:`, {
                    projectId,
                    sandboxId,
                    sandboxUrl,
                    sandboxStatus
                });
            }
        } catch (error: any) {
            console.error('[getProject] Error managing sandbox:', {
                projectId,
                error: error.message,
                stack: error.stack
            });
            // Continue with existing sandboxUrl if available, or set status to expired
            if (!sandboxUrl) {
                sandboxStatus = 'expired';
                await prisma.project.update({
                    where: { id: projectId },
                    data: { sandboxStatus: 'expired' } as any
                });
            }
        }

        // 3. List files from R2
        const files = await listFiles(projectId);
        console.log("[getProject] files", files);

        // 4. Return the response
        res.json({
            success: true,
            project: {
                ...project,
                files: files.filter(Boolean), // Remove any empty strings
                sandboxUrl: sandboxUrl || null,
                sandboxStatus: sandboxStatus || null,
                sandboxId: sandboxId || null
            }
        });

    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch project'
        });
    }
};

/**
 * Get a file from the project
 * Route: GET /api/projects/:projectId/file
 * @param req - projectId and filePath
 * @param res - response object
 * @returns The file content
 */
export const getFile = async (
    req: AuthenticatedRequest,
    res: Response,
) => {
    const { projectId } = req.params;
    const { path: filePath } = req.query as { path: string };

    if (!filePath) {
        return res.json(
            { error: 'File path is required' },
        ).status(400);
    }

    const path = `projects/${projectId}/${filePath}`;

    try {
        const content = await getR2File(path);
        return res.json({ content }).status(200);
    } catch (error) {
        console.error('Error fetching file:', error);
        return res.json(
            { error: 'Failed to fetch file' },
        ).status(500);
    }
}



/**
 * Get all conversations for a project
 * Route: GET /api/projects/:projectId/conversations
 * @param req - projectId
 * @param res - response object
 * @returns The conversations for the project
 */
export const getProjectConversations = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check if project exists and user has access
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { userId: true }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Get the chat and its messages for the project
        const chat = await prisma.chat.findUnique({
            where: { projectId },
            include: {
                messages: {
                    orderBy: { createdOn: 'asc' },
                    include: {
                        assistantResponses: {
                            orderBy: { createdOn: 'asc' }
                        }
                    }
                }
            }
        });

        if (!chat) {
            return res.json({ data: [] });
        }

        // Format the response
        const conversations = chat.messages.flatMap(message => {
            const messageData = message.data as MessageData | null;
            const conversation = {
                id: message.id,
                role: message.role,
                content: messageData?.content || '',
                createdOn: message.createdOn,
                assistantResponses: message.assistantResponses.map(res => {
                    const responseData = res.data as MessageData | null;
                    return {
                        id: res.id,
                        role: res.role,
                        content: responseData?.content || '',
                        createdOn: res.createdOn
                    };
                })
            };
            return [conversation];
        });

        return res.json({ data: conversations });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Create a new conversation for the project
 * Route: POST /api/projects/:projectId/conversation
 * @param req - projectId and query
 * @param res - response object
 * @returns The conversation created
 */
export const createConversation = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const userId = (req as any).user?.id;
        const { query } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }


        // Check if project exists and user has access
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        }) as any;

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Check and ensure sandbox is available before modifying project
        // Note: generateAndUploadProjectFiles will create a new sandbox, but we should
        // try to use existing one if available. For now, we'll let it recreate and update DB after.
        // TODO: Refactor generateAndUploadProjectFiles to accept optional sandbox parameter
        if (project.sandboxId && project.sandboxStatus === 'expired') {
            console.log(`[createConversation] Project ${projectId} has expired sandbox, will be recreated during file operations`);
        }

        let assistantResponse = '';
        const generatedFiles: Array<{ path: string; content: string; publicUrl?: string; r2Url?: string }> = [];
        const existingFiles: Array<string> = [];

        // If this is a user message, process it with the LLM
        if (query) {
            try {
                const userQuery = query;

                // Get recent conversation history for context
                const recentMessages = await prisma.chat.findMany({
                    where: { projectId },
                    include: {
                        messages: {
                            orderBy: { createdOn: 'desc' },
                            take: 5, // Get last 5 messages for context
                            include: {
                                assistantResponses: {
                                    orderBy: { createdOn: 'desc' },
                                    take: 5
                                }
                            }
                        }
                    }
                });

                // console.log("recentMessages", recentMessages);

                const projectStructure = await listFiles(projectId)
                // console.log("projectStructure", projectStructure);
                // inside projectStrucutre we only have file name need to get the content of the file and give it to the LLM
                for (const filePath of projectStructure) {
                    const path = `projects/${projectId}/${filePath}`;
                    const content = await getR2File(path);
                    existingFiles.push(`File: ${filePath}\nContent:\n${content}\n`);
                }

                // Format the prompt with conversation history
                const context = recentMessages
                    .flatMap((chat: any) => chat.messages) // flatten all chat messages
                    .sort((a: any, b: any) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime())
                    .flatMap((msg: any) => {
                        // each ChatConversation message + its assistant responses
                        const lines = [];

                        // main conversation message
                        if (msg?.data?.content) {
                            lines.push(`${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.data.content}`);
                        }

                        // nested assistant responses (if any)
                        if (msg.assistantResponses && msg.assistantResponses.length > 0) {
                            for (const res of msg.assistantResponses) {
                                if (res?.data?.content) {
                                    lines.push(`Assistant: ${res.data.content}`);
                                }
                            }
                        }

                        return lines;
                    })
                    .join('\n');

                // console.log("context", context);


                const enhancedPrompt = `
                    Project Structure:
                    ${projectStructure}

                    Conversation History:
                    ${context}

                    Existing Files:
                    ${existingFiles.join('\n')}

                    User Query: ${userQuery}

                    Assistant:`;

                console.log("enhancedPrompt", enhancedPrompt);

                // Use the project object we already have from the earlier query
                const projectName = project.title || 'untitled-project';

                // Call generateAndUploadProjectFiles with project name
                const result = await generateAndUploadProjectFiles(projectId, enhancedPrompt, projectName, false);
                // const result = { success: false, files: [], error: 'File generation failed', warning: 'No files needed to be modified',  };

                if (result.success) {
                    // Format the success response
                    assistantResponse = result.files?.length
                        ? `I've processed your request and updated the project.`
                        : 'I understand your request, but no files needed to be modified.';

                    if (result.files?.length) {
                        generatedFiles.length = 0;
                        generatedFiles.push(...result.files);
                        const fileList = result.files.map((f: any) => `- ${f.path}`).join('\n');
                        assistantResponse += `\n\nUpdated files:\n${fileList}`;
                    }

                    if (result.warning) {
                        assistantResponse += `\n\nNote: ${result.warning}`;
                    }

                    // Update sandbox info in database if new sandbox was created
                    // Note: generateAndUploadProjectFiles creates a new sandbox each time
                    // In the future, we should refactor to reuse existing sandbox
                    if (result.sandboxId && result.sandboxUrl) {
                        try {
                            await prisma.project.update({
                                where: { id: projectId },
                                data: {
                                    sandboxId: result.sandboxId,
                                    sandboxUrl: result.sandboxUrl,
                                    sandboxStatus: 'active'
                                } as any
                            });
                            console.log(`[createConversation] Updated sandbox info for project ${projectId}:`, {
                                projectId,
                                sandboxId: result.sandboxId,
                                sandboxUrl: result.sandboxUrl
                            });
                        } catch (dbError) {
                            console.error('[createConversation] Error updating sandbox info:', dbError);
                        }
                    }
                } else {
                    assistantResponse = 'I encountered an error processing your request. ' +
                        (result.error ? `Error: ${result.error}` : 'Please try again.');
                    console.error('[createConversation] File generation failed:', result.error);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                assistantResponse = `Error processing your request: ${errorMessage}`;
                console.error('Error in LLM processing:', error);
            }
        }

        // get chat or create new chat if not exists
        const chat = await prisma.chat.upsert({
            where: { projectId },
            update: {},
            create: { project: { connect: { id: projectId } } },
            select: { id: true }
        });

        // create chat conversation
        await prisma.chatConversation.create({
            data: {
                chatId: chat.id,
                role: "user",
                data: { content: query },
                assistantResponses: {
                    create: {
                        role: "assistant",
                        data: { content: assistantResponse }
                    }
                }
            }
        });


        return res.status(201).json({
            success: true,
            data: assistantResponse
        });

    } catch (error) {
        console.error('Error creating conversation:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid request data',
                details: error
            });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
};

