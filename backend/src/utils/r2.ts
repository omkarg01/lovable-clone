import { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";


let r2: S3Client | null = null;

function getR2Client() {
    if (!r2) {
        if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_ACCESS_KEY_ID || !process.env.CLOUDFLARE_SECRET_ACCESS_KEY) {
            console.warn('Missing Cloudflare R2 configuration. File storage will be disabled.');
            return null;
        }

        r2 = new S3Client({
            region: 'auto',
            endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
                secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
            },
            forcePathStyle: true,
            tls: process.env.NODE_ENV === 'production',
            apiVersion: '2006-03-01',
            maxAttempts: 3,
            retryMode: 'standard',
        });
    }
    return r2;
}


export async function listFiles(projectId: string): Promise<string[]> {
    const r2 = getR2Client();
    if (!r2 || !process.env.CLOUDFLARE_BUCKET) {
        console.warn('R2 storage not configured - listFiles returning empty array');
        return [];
    }

    try {
        const prefix = `projects/${projectId}`;
        const command = new ListObjectsV2Command({
            Bucket: process.env.CLOUDFLARE_BUCKET,
            Prefix: prefix,
        });

        const response = await r2.send(command);
        // console.log("response", response);

        if (!response.Contents) return [];

        // Filter out directories and map to file paths
        return response.Contents
            .filter((item: any) => item.Key && !item.Key.endsWith('/'))
            .map((item: any) => item.Key?.replace(prefix, '') || '');
    } catch (error) {
        console.error('Error listing files from R2:', error);
        return [];
    }
}

export async function uploadToR2(path: string, content: string, contentType: string = "text/plain") {
    const r2 = getR2Client();
    if (!r2 || !process.env.CLOUDFLARE_BUCKET) {
        console.warn('R2 storage not configured - uploadToR2 returning error');
        throw new Error('R2 storage not configured');
    }
    const Key = path.startsWith('/') ? path.substring(1) : path; // Remove leading slash if present

    try {
        const parallelUploads3 = new Upload({
            client: r2,
            params: {
                Bucket : process.env.CLOUDFLARE_BUCKET,
                Key,
                Body: content,
                ContentType: contentType,
            },
        });

        await parallelUploads3.done();

        // Return the URLs in the expected format
        return {
            publicUrl: `https://pub-0917616871ea40b0a02cefc9f9aac23d.r2.dev/${Key}`,
            r2Url: `https://${process.env.CLOUDFLARE_BUCKET}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${Key}`
        };
    } catch (error) {
        console.error('Error uploading to R2:', error);
        throw error;
    }
}

export async function getR2File(path: string): Promise<string> {
    const r2 = getR2Client();
    if (!r2 || !process.env.CLOUDFLARE_BUCKET) {
        console.warn('R2 storage not configured - getR2FileByPath returning error');
        throw new Error('R2 storage not configured');
    }
    const Key = path.startsWith('/') ? path.substring(1) : path; // Remove leading slash if present
    console.log("Key", Key);
    const command = new GetObjectCommand({
        Bucket: process.env.CLOUDFLARE_BUCKET,
        Key
    });

    try {
        const response = await r2.send(command);
        if (!response.Body) {
            throw new Error('File is empty');
        }
        return await response.Body.transformToString('utf-8');
    } catch (error: any) {
        console.error('Error getting file from R2:', error);
        if (error.name === 'NoSuchKey') {
            throw new Error(`File not found: ${Key}`);
        }
        throw new Error(`Failed to get file: ${error.message}`);
    }
}

export async function deleteFromR2(path: string) {
    const r2 = getR2Client();
    if (!r2 || !process.env.CLOUDFLARE_BUCKET) {
        console.warn('R2 storage not configured - deleteFromR2 returning error');
        throw new Error('R2 storage not configured');
    }
    const Key = path.startsWith('/') ? path.substring(1) : path; // Remove leading slash if present

    try {
        const command = new DeleteObjectCommand({
            Bucket: process.env.CLOUDFLARE_BUCKET,
            Key,
        });

        await r2.send(command);
    } catch (error) {
        console.error('Error deleting from R2:', error);
        throw error;
    }
}