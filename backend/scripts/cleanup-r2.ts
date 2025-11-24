import dotenv from 'dotenv';
dotenv.config();

import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

// R2 Client setup
function getR2Client() {
  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_ACCESS_KEY_ID || !process.env.CLOUDFLARE_SECRET_ACCESS_KEY) {
    throw new Error('Missing Cloudflare R2 configuration');
  }

  return new S3Client({
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

async function deleteAllR2Files() {
  const r2 = getR2Client();
  const bucket = process.env.CLOUDFLARE_BUCKET;
  
  if (!bucket) {
    throw new Error('CLOUDFLARE_BUCKET not configured');
  }

  console.log('🗑️  Starting R2 bucket cleanup...');
  console.log(`📦 Bucket: ${bucket}`);
  console.log(`🔍 Looking for files with prefix: projects/\n`);
  
  let deletedCount = 0;
  let continuationToken: string | undefined;

  do {
    // List all objects in the bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: 'projects/', // Only delete project files
      ContinuationToken: continuationToken,
      MaxKeys: 1000, // AWS/R2 allows up to 1000 objects per request
    });

    const listResponse = await r2.send(listCommand);
    
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      if (deletedCount === 0) {
        console.log('✅ No files found in R2 bucket');
      }
      break;
    }

    // Prepare objects for deletion (batch delete up to 1000 objects)
    const objectsToDelete = listResponse.Contents
      .filter(item => item.Key && !item.Key.endsWith('/')) // Filter out directories
      .map(item => ({ Key: item.Key! }));

    if (objectsToDelete.length > 0) {
      // Delete in batches (R2 supports up to 1000 objects per delete request)
      for (let i = 0; i < objectsToDelete.length; i += 1000) {
        const batch = objectsToDelete.slice(i, i + 1000);
        
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: batch,
            Quiet: false, // Set to true if you don't want detailed response
          },
        });

        const deleteResponse = await r2.send(deleteCommand);
        deletedCount += batch.length;
        
        console.log(`✅ Deleted ${batch.length} files (Total: ${deletedCount})`);
        
        if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
          console.error('❌ Errors during deletion:');
          deleteResponse.Errors.forEach(error => {
            console.error(`   - ${error.Key}: ${error.Code} - ${error.Message}`);
          });
        }
      }
    }

    // Check if there are more objects to list
    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  console.log(`\n✅ R2 cleanup complete! Deleted ${deletedCount} files total`);
  return deletedCount;
}

// Run cleanup
deleteAllR2Files()
  .then(() => {
    console.log('✅ R2 cleanup finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error during R2 cleanup:', error);
    process.exit(1);
  });