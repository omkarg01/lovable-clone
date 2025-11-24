import { Router } from 'express';
import { createConversation, createProject, getFile, getProject, getProjects, getProjectConversations } from '../controllers/project.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/projects - List all projects for the authenticated user
router.get('/', authenticate, getProjects);

// POST /api/projects - Create a new project
router.post('/', authenticate, createProject);

// GET /api/projects/:projectId - Get project details and file list
router.get('/:projectId', authenticate, getProject);

// GET /api/projects/:projectId/file - Get a file from the project
router.get('/:projectId/file', authenticate, getFile);

// POST /api/projects/:projectId/conversation - Create a new conversation for the project
router.post('/:projectId/conversation', authenticate, createConversation);

// GET /api/projects/:projectId/conversations - Get all conversations for a project
router.get('/:projectId/conversations', authenticate, getProjectConversations);

export default router;
