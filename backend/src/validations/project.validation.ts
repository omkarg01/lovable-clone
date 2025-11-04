import { z } from 'zod';

export const createProjectSchema = z.object({
    initialPrompt: z.string()
        .min(1, 'Initial prompt is required')
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;



// export type CreateConversationInput = z.infer<typeof createConversationSchema>;