import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import dotenv from 'dotenv';
dotenv.config();


// Create a custom credentials provider that only uses environment variables
const customCredentialProvider = async () => {
    return {
        accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
    };
};

const Bucket = process.env.CLOUDFLARE_BUCKET;


// Configure the S3 client
const s3Config: any = {
    region: 'auto', // Must be 'auto' for Cloudflare R2
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: customCredentialProvider,
    forcePathStyle: true, // Required for Cloudflare R2
    tls: process.env.NODE_ENV === 'production',
    apiVersion: '2006-03-01',
    maxAttempts: 3,
    retryMode: 'standard',
    disableHostPrefix: true,
};

// Create a single instance of the S3 client
export const r2 = new S3Client(s3Config);

export async function listFiles(projectId: string): Promise<string[]> {
    try {
        const prefix = `projects/${projectId}/`;
        const command = new ListObjectsV2Command({
            Bucket,
            Prefix: prefix,
        });

        const response = await r2.send(command);

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
    const Key = path.startsWith('/') ? path.substring(1) : path; // Remove leading slash if present

    try {
        const parallelUploads3 = new Upload({
            client: r2,
            params: {
                Bucket,
                Key,
                Body: content,
                ContentType: contentType,
            },
        });

        await parallelUploads3.done();

        // Return the URLs in the expected format
        return {
            publicUrl: `https://pub-0917616871ea40b0a02cefc9f9aac23d.r2.dev/${Key}`,
            r2Url: `https://${Bucket}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${Key}`
        };
    } catch (error) {
        console.error('Error uploading to R2:', error);
        throw error;
    }
}

export async function getR2File(projectId: string, filePath: string): Promise<string> {
    // Remove any leading slashes from the file path
    const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    
    // Construct the full key with projects/ prefix
    const key = `projects/${projectId}/${normalizedPath}`;
    
    console.log('Fetching file with key:', key); // Debug log
    
    const command = new GetObjectCommand({
        Bucket,
        Key: key
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
            throw new Error(`File not found: ${key}`);
        }
        throw new Error(`Failed to get file: ${error.message}`);
    }
}