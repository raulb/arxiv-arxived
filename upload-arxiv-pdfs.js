const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
const { fetchArxivEntries } = require('./list-arxiv');

// Configure AWS SDK v3
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = 'arxiv-ai'; 

async function fetchAndUploadArxivPdfs() {
  try {
    console.log('Fetching data from arXiv API...\n');
    
    const entries = await fetchArxivEntries({
      maxResults: 5,
      sortBy: 'lastUpdatedDate',
      sortOrder: 'descending',
      filterLast24Hours: false
    });
    
    console.log(`Found ${entries.length} papers\n`);
    
    // Process each entry
    for (const entry of entries) {
      await processEntry(entry);
    }
    
    console.log('\nDone!');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function processEntry(entry) {
  try {
    // Debug: log the entry to see what we're working with
    console.log('Processing entry:', {
      title: entry.title,
      arxivId: entry.arxivId,
      published: entry.published,
      pdfUrl: entry.pdfUrl
    });
    
    // Validate required fields
    if (!entry.arxivId) {
      throw new Error('Missing arxivId');
    }
    if (!entry.pdfUrl) {
      throw new Error('Missing pdfUrl');
    }
    
    // Create S3 key - handle potential date issues
    const date = new Date(entry.published);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${entry.published}`);
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Clean the arxivId to ensure it's safe for S3 key
    const cleanArxivId = entry.arxivId.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `arxiv-papers/${year}/${month}/${day}/${cleanArxivId}.pdf`;
    
    console.log(`S3 Key: ${s3Key}`);
    
    // Check if file already exists in S3
    const exists = await checkIfExists(s3Key);
    
    if (exists) {
      console.log(`✓ Already exists: ${entry.arxivId} - ${entry.title}`);
      return;
    }
    
    // Download and upload PDF
    console.log(`↓ Downloading: ${entry.arxivId} - ${entry.title}`);
    console.log(`  From URL: ${entry.pdfUrl}`);
    
    const pdfResponse = await axios.get(entry.pdfUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: 50 * 1024 * 1024, // 50MB max
      headers: {
        'User-Agent': 'ArxivPDFFetcher/1.0'
      }
    });
    
    const pdfBuffer = Buffer.from(pdfResponse.data);
    console.log(`  Downloaded ${pdfBuffer.length} bytes`);
    
    // Clean the title for metadata - remove newlines and other problematic characters
    const cleanTitle = entry.title
      .replace(/[\n\r]/g, ' ')  // Replace newlines with spaces
      .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
      .trim()                   // Remove leading/trailing whitespace
      .substring(0, 1024);      // Limit length
    
    // Upload to S3 using v3 SDK
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: {
        'arxiv-id': entry.arxivId,
        'title': cleanTitle,
        'published': entry.published
      }
    };
    
    await s3Client.send(new PutObjectCommand(uploadParams));
    
    console.log(`✓ Uploaded: ${s3Key}`);
    
  } catch (error) {
    console.error(`✗ Error processing ${entry.title || 'unknown'}:`, error.message);
    console.error('  Full error:', error);
  }
}

async function checkIfExists(key) {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    }));
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    // Log other errors but don't throw
    console.error('Error checking if file exists:', error.message);
    return false;
  }
}

// Run the script
fetchAndUploadArxivPdfs();
