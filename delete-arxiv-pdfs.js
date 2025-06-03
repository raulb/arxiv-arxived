const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

// Configure AWS SDK v3
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = 'arxiv-ai';

async function cleanupS3BucketWithFilter(options = {}) {
  const {
    prefix = '',           // e.g., 'arxiv-papers/2025/05/'
    olderThanDays = null,  // Delete files older than X days
    pattern = null         // RegExp pattern to match keys
  } = options;
  
  try {
    console.log(`🗑️  Starting filtered cleanup of S3 bucket: ${BUCKET_NAME}`);
    if (prefix) console.log(`  Prefix: ${prefix}`);
    if (olderThanDays) console.log(`  Older than: ${olderThanDays} days`);
    if (pattern) console.log(`  Pattern: ${pattern}`);
    console.log('');
    
    let totalDeleted = 0;
    let continuationToken = null;
    const cutoffDate = olderThanDays ? new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000) : null;
    
    do {
      // List objects in the bucket
      const listParams = {
        Bucket: BUCKET_NAME,
        MaxKeys: 1000,
        Prefix: prefix,
        ContinuationToken: continuationToken
      };
      
      const listResponse = await s3Client.send(new ListObjectsV2Command(listParams));
      
      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        console.log('✓ No matching objects found!');
        break;
      }
      
      // Filter objects based on criteria
      let objectsToDelete = listResponse.Contents;
      
      // Apply date filter
      if (cutoffDate) {
        objectsToDelete = objectsToDelete.filter(obj => 
          new Date(obj.LastModified) < cutoffDate
        );
      }
      
      // Apply pattern filter
      if (pattern) {
        const regex = new RegExp(pattern);
        objectsToDelete = objectsToDelete.filter(obj => 
          regex.test(obj.Key)
        );
      }
      
      if (objectsToDelete.length === 0) {
        console.log('No objects match the filter criteria in this batch.');
        continuationToken = listResponse.NextContinuationToken;
        continue;
      }
      
      console.log(`Found ${objectsToDelete.length} objects to delete...`);
      
      // Prepare for deletion
      const deleteObjects = objectsToDelete.map(obj => ({ Key: obj.Key }));
      
      // Delete objects
      const deleteParams = {
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: deleteObjects,
          Quiet: false
        }
      };
      
      const deleteResponse = await s3Client.send(new DeleteObjectsCommand(deleteParams));
      
      // Log deleted objects
      if (deleteResponse.Deleted) {
        deleteResponse.Deleted.forEach(obj => {
          console.log(`  ✓ Deleted: ${obj.Key}`);
        });
        totalDeleted += deleteResponse.Deleted.length;
      }
      
      // Log any errors
      if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
        console.error('\n❌ Errors occurred:');
        deleteResponse.Errors.forEach(err => {
          console.error(`  - ${err.Key}: ${err.Message}`);
        });
      }
      
      continuationToken = listResponse.NextContinuationToken;
      
    } while (continuationToken);
    
    console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} objects from ${BUCKET_NAME}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    console.error('Full error:', error);
  }
}

// Example usage:
// cleanupS3BucketWithFilter({
//   prefix: 'arxiv-papers/2025/05/',  // Delete only May 2025 papers
//   olderThanDays: 30,                 // Delete files older than 30 days
//   pattern: '.*\.pdf$'                // Delete only PDF files
// });

// For complete cleanup, just call without filters:
cleanupS3BucketWithFilter();
