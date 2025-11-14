import { z } from "zod";
import { uploadToR2 } from "../src/utils/r2";

// Helper function to get content type based on file extension
function getContentType(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'css': return 'text/css';
    case 'js': 
    case 'jsx': 
    case 'ts':
    case 'tsx': return 'application/javascript';
    case 'html': return 'text/html';
    case 'json': return 'application/json';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'svg': return 'image/svg+xml';
    case 'md': return 'text/markdown';
    default: return 'text/plain';
  }
}

export const createFile = {
  description: 'Create a file at a specified location with given content',
  inputSchema: z.object({
    location: z.string().describe('Relative path to the file'),
    content: z.string().describe('Content of the file')
  }),
  execute: async ({ location, content }: { location: string; content: string }) => {
    try {
      const contentType = getContentType(location);
      const result = await uploadToR2(location, content, contentType);
      return {
        success: true,
        message: `File created at ${location}`,
        url: result.publicUrl,
        r2Url: result.r2Url
      };
    } catch (error : any) {
      console.error('Error creating file:', error);
      return {
        success: false,
        message: `Failed to create file: ${error.message}`,
        error: error.toString()
      };
    }
  }
};

export const updateFile = {
  description: 'Update content of an existing file',
  inputSchema: z.object({
    location: z.string().describe('Relative path to the file'),
    content: z.string().describe('New content of the file')
  }),
  execute: async ({ location, content }: { location: string; content: string }) => {
    try {
      const contentType = getContentType(location);
      const result = await uploadToR2(location, content, contentType);
      return {
        success: true,
        message: `File updated at ${location}`,
        url: result.publicUrl,
        r2Url: result.r2Url
      };
    } catch (error : any) {
      console.error('Error updating file:', error);
      return {
        success: false,
        message: `Failed to update file: ${error.message}`,
        error: error.toString()
      };
    }
  }
};

export const deleteFile = {
  description: 'Delete a file at a specified location',
  inputSchema: z.object({
    location: z.string().describe('Relative path to the file to delete')
  }),
  execute: async ({ location }: { location: string }) => {
    try {
      // Note: You'll need to implement deleteObject in your R2 client
      // and then call it here
      return {
        success: true,
        message: `File deleted: ${location}`
      };
    } catch (error : any    ) {
      console.error('Error deleting file:', error);
      return {
        success: false,
        message: `Failed to delete file: ${error.message}`
      };
    }
  }
};

export const readFile = {
  description: 'Read content of a file',
  inputSchema: z.object({
    location: z.string().describe('Relative path to the file to read')
  }),
  execute: async ({ location }: { location: string }) => {
    try {
      // Note: You'll need to implement getObject in your R2 client
      // and then call it here
      return {
        success: true,
        content: 'File content would be here',
        exists: true
      };
    } catch (error : any) {
      console.error('Error reading file:', error);
      return {
        success: false,
        exists: false,
        message: `Failed to read file: ${error.message}`
      };
    }
  }
};