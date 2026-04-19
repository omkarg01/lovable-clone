import { Sandbox } from '@e2b/code-interpreter';
import { listFiles, getR2File } from './r2.js';
import { waitUntilPreviewReady } from './waitUntilPreviewReady.js';
import path from 'path';
import prisma from '../lib/prisma.js';

interface SandboxInfo {
  sandbox: Sandbox;
  sandboxUrl: string;
  sandboxId: string;
}

/**
 * Check if a sandbox is still active by trying to reconnect
 * @param sandboxId - The sandbox ID to check
 * @returns true if sandbox is active, false otherwise
 */
export async function checkSandboxActive(sandboxId: string): Promise<boolean> {
  const startTime = Date.now();
  const logContext = { sandboxId, operation: 'checkSandboxActive' };

  try {
    console.log(`[SandboxManager] Checking if sandbox is active: ${sandboxId}`, logContext);

    // Try to connect to the existing sandbox
    const sandbox = await Sandbox.connect(sandboxId);

    // Try a simple operation to verify it's working
    await sandbox.commands.run('echo "test"', { timeoutMs: 5000 });

    // Note: E2B sandboxes don't have a close() method when connected
    // The connection will be closed automatically
    const duration = Date.now() - startTime;

    console.log(`[SandboxManager] Sandbox is active: ${sandboxId}`, { ...logContext, duration, success: true });
    return true;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`[SandboxManager] Sandbox is not active: ${sandboxId}`, {
      ...logContext,
      duration,
      success: false,
      error: error.message
    });
    return false;
  }
}

/**
 * Recreate a sandbox for an existing project
 * Restores all files from R2 storage
 * @param projectId - The project ID
 * @param projectName - The project name
 * @returns SandboxInfo with sandbox, URL, and ID
 */
export async function recreateProjectSandbox(
  projectId: string,
  projectName: string
): Promise<SandboxInfo> {
  const startTime = Date.now();
  const logContext = { projectId, projectName, operation: 'recreateProjectSandbox' };

  console.log(`[SandboxManager] Recreating sandbox for project ${projectId}`, logContext);

  try {
    // 1. Create new sandbox
    const sandbox = await Sandbox.create('f9osur8wx7gur0n4hja6', {
      timeoutMs: 3600000 // 1 hour
    });

    const sandboxId = sandbox.sandboxId;
    console.log(`[SandboxManager] Created new sandbox: ${sandboxId}`, { ...logContext, sandboxId });

    // 2. Create project directory
    const projectDir = `/home/user/${projectName}`;
    await sandbox.commands.run(`mkdir -p "${projectDir}"`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Restore files from R2
    const r2filenames = await listFiles(projectId);
    console.log(`[SandboxManager] Restoring ${r2filenames.length} files from R2`, { ...logContext, fileCount: r2filenames.length });

    const projectFiles = await Promise.all(
      r2filenames.map(async (file) => {
        try {
          const content = await getR2File(path.posix.join("projects", projectId, file));
          return { path: file, content };
        } catch (error: any) {
          console.error(`[SandboxManager] Error reading file ${file} from R2:`, error);
          return { path: file, content: '' };
        }
      })
    );

    // 4. Write files to sandbox
    let restoredCount = 0;
    for (const file of projectFiles) {
      try {
        await sandbox.files.write(`/home/user/${file.path}`, file.content);
        restoredCount++;
        console.log(`[SandboxManager] Restored file: ${file.path}`, { ...logContext, filePath: file.path });
      } catch (error: any) {
        console.error(`[SandboxManager] Error restoring file ${file.path}:`, { ...logContext, filePath: file.path, error: error.message });
      }
    }

    console.log(`[SandboxManager] Restored ${restoredCount}/${projectFiles.length} files`, { ...logContext, restoredCount, totalFiles: projectFiles.length });


    const devConfig = {
      command: 'npm run dev',
      port: 5175
    };


    // 6. Get sandbox URL
    const host = sandbox.getHost(devConfig.port);
    const sandboxUrl = `https://${host}`;

    // 7. Start the dev server
    const fullCommand = `cd /home/user/${projectName} && npm install && ${devConfig.command}`;
    console.log(`[SandboxManager] Starting dev server: ${fullCommand}`, { ...logContext, command: fullCommand });

    await sandbox.commands.run(fullCommand, {
      timeoutMs: 0,
      background: true,
      onStdout: (data: any) => console.log('[SandboxManager] stdout:', { ...logContext, data }),
      onStderr: (data: any) => console.error('[SandboxManager] stderr:', { ...logContext, data }),
      envs: { SKIP_PREFLIGHT_CHECK: "true" }
    });

    await waitUntilPreviewReady(sandboxUrl);

    const duration = Date.now() - startTime;
    console.log(`[SandboxManager] Successfully recreated sandbox for project ${projectId}`, {
      ...logContext,
      sandboxId,
      sandboxUrl,
      duration,
      success: true
    });

    return {
      sandbox,
      sandboxUrl,
      sandboxId
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[SandboxManager] Error recreating sandbox for project ${projectId}:`, {
      ...logContext,
      duration,
      success: false,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get or recreate sandbox for a project
 * Returns active sandbox info, recreating if necessary
 * @param projectId - The project ID
 * @param projectName - The project name
 * @returns SandboxInfo with sandbox, URL, and ID
 */
export async function getOrRecreateSandbox(
  projectId: string,
  projectName: string
): Promise<SandboxInfo> {
  const startTime = Date.now();
  const logContext = { projectId, projectName, operation: 'getOrRecreateSandbox' };

  console.log(`[SandboxManager] Getting or recreating sandbox for project ${projectId}`, logContext);

  try {
    // 1. Get project from database
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    // 2. If no sandbox ID stored, create new one
    const projectSandboxId = (project as any)?.sandboxId;
    if (!projectSandboxId) {
      console.log(`[SandboxManager] No sandbox ID found for project ${projectId}, creating new sandbox`, logContext);

      // Update status to indicate we're creating
      await prisma.project.update({
        where: { id: projectId },
        data: { sandboxStatus: 'active' } as any
      });

      return await recreateProjectSandbox(projectId, projectName);
    }

    // 3. Check if existing sandbox is still active
    const isActive = await checkSandboxActive(projectSandboxId);

    if (isActive) {
      // Reconnect to existing sandbox
      console.log(`[SandboxManager] Reconnecting to existing sandbox ${projectSandboxId}`, { ...logContext, sandboxId: projectSandboxId });
      const sandbox = await Sandbox.connect(projectSandboxId);

      // Get the URL (we need to know the port - assume 5175 for now)
      // TODO: Store port in database for accurate URL generation
      const host = sandbox.getHost(5175);
      const sandboxUrl = `https://${host}`;

      // Update status to active
      await prisma.project.update({
        where: { id: projectId },
        data: {
          sandboxStatus: 'active',
          sandboxUrl: sandboxUrl
        } as any
      });

      const duration = Date.now() - startTime;
      console.log(`[SandboxManager] Successfully reconnected to sandbox ${projectSandboxId}`, {
        ...logContext,
        sandboxId: projectSandboxId,
        sandboxUrl,
        duration,
        success: true
      });

      return {
        sandbox,
        sandboxUrl,
        sandboxId: projectSandboxId
      };
    } else {
      // Sandbox expired, recreate
      console.log(`[SandboxManager] Sandbox ${projectSandboxId} expired, recreating...`, { ...logContext, sandboxId: projectSandboxId });

      // Update status to indicate we're recreating
      await prisma.project.update({
        where: { id: projectId },
        data: { sandboxStatus: 'expired' } as any
      });

      return await recreateProjectSandbox(projectId, projectName);
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[SandboxManager] Error in getOrRecreateSandbox for project ${projectId}:`, {
      ...logContext,
      duration,
      success: false,
      error: error.message
    });
    throw error;
  }
}

/**
 * Result of resolving an E2B sandbox for LLM file generation (create vs edit flows).
 */
export interface SandboxForGenerationResult {
  sandbox: Sandbox;
  sandboxId: string;
  sandboxUrl: string;
  /** True when we reconnected to the VM that already runs the dev server */
  reused: boolean;
  /** True when reconnect failed and we rebuilt from R2 via recreateProjectSandbox (dev already started there) */
  restoredFromR2: boolean;
}

/**
 * Picks the right sandbox for generateAndUploadProjectFiles:
 * - New project / no stored sandboxId: new empty VM only (do not restore from R2 before the LLM writes).
 * - Stored sandboxId: connect + quick health check; on failure, recreateProjectSandbox (R2 + dev).
 *
 * Callers should skip `npm install && npm run dev` when `reused || restoredFromR2`.
 */
export async function getSandboxForProjectGeneration(params: {
  projectId: string;
  projectName: string;
  existingSandboxId?: string | null;
  isNewProject: boolean;
}): Promise<SandboxForGenerationResult> {
  const { projectId, projectName, existingSandboxId, isNewProject } = params;
  const logCtx = { projectId, projectName, op: 'getSandboxForProjectGeneration' };

  if (isNewProject || !existingSandboxId) {
    console.log('[SandboxManager] Fresh sandbox for generation (new project or no sandboxId)', logCtx);
    const sandbox = await Sandbox.create('f9osur8wx7gur0n4hja6', {
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: 3600000,
    });
    const host = sandbox.getHost(5175);
    return {
      sandbox,
      sandboxId: sandbox.sandboxId,
      sandboxUrl: `https://${host}`,
      reused: false,
      restoredFromR2: false,
    };
  }

  try {
    console.log('[SandboxManager] Reconnecting sandbox for generation', { ...logCtx, existingSandboxId });
    const sandbox = await Sandbox.connect(existingSandboxId);
    await sandbox.commands.run('echo "ok"', { timeoutMs: 5000 });
    const host = sandbox.getHost(5175);
    return {
      sandbox,
      sandboxId: existingSandboxId,
      sandboxUrl: `https://${host}`,
      reused: true,
      restoredFromR2: false,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.log('[SandboxManager] Reconnect failed; recreating from R2', { ...logCtx, error: message });
    const info = await recreateProjectSandbox(projectId, projectName);
    return {
      sandbox: info.sandbox,
      sandboxId: info.sandboxId,
      sandboxUrl: info.sandboxUrl,
      reused: false,
      restoredFromR2: true,
    };
  }
}