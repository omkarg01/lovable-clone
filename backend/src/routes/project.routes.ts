import { Router } from 'express';
import { createConversation, createProject, getFile, getProject, getProjects, getProjectConversations } from '../controllers/project.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// GET /api/projects - List all projects for the authenticated user
router.get('/', authenticate, getProjects);

// POST /api/projects - Create a new project
router.post('/', authenticate, createProject);

// GET /api/projects/:projectId - Get project details and file list
router.get('/:projectId', authenticate, getProject);

router.get('/:projectId/file', authenticate, getFile);

router.post('/conversation/:projectId', authenticate, createConversation);

// GET /api/projects/:projectId/conversations - Get all conversations for a project
router.get('/conversation/:projectId', authenticate, getProjectConversations);

export default router;
