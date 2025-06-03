const axios = require('axios');
const xml2js = require('xml2js');

async function fetchArxivEntries(options = {}) {
  const {
    maxResults = 200,
    sortBy = 'submittedDate',
    sortOrder = 'descending',
    filterLast24Hours = false
  } = options;

  try {
    // Make the API request
    const url = `https://export.arxiv.org/api/query?search_query=ti:%22AI%22+AND+cat:cs.AI&sortBy=${sortBy}&sortOrder=${sortOrder}&start=0&max_results=${maxResults}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'ArxivPDFFetcher/1.0'
      }
    });

    // Parse XML to JSON
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true
    });
    
    const result = await parser.parseStringPromise(response.data);
    
    // Extract entries
    const entries = result.feed.entry;
    let entriesArray = Array.isArray(entries) ? entries : [entries];
    
    // Filter last 24 hours if requested
    if (filterLast24Hours) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      entriesArray = entriesArray.filter(entry => {
        const publishedDate = new Date(entry.published);
        return publishedDate >= twentyFourHoursAgo;
      });
    }
    
    // Process entries to extract relevant information
    const processedEntries = entriesArray.map(entry => {
      const links = Array.isArray(entry.link) ? entry.link : [entry.link];
      const pdfLink = links.find(link => 
        link.type === 'application/pdf' || 
        (link.href && link.href.includes('/pdf/'))
      );
      
      // More robust arxivId extraction
      let arxivId = null;
      if (entry.id) {
        // Try to extract from the id field
        const match = entry.id.match(/abs\/(.+)$/);
        if (match) {
          arxivId = match[1];
        } else {
          // Fallback: use the whole id if pattern doesn't match
          arxivId = entry.id.replace('http://arxiv.org/abs/', '');
        }
      }
      
      return {
        title: entry.title,
        arxivId: arxivId,
        published: entry.published,
        updated: entry.updated,
        pdfUrl: pdfLink ? pdfLink.href : null,
        abstract: entry.summary
      };
    }).filter(entry => entry.pdfUrl && entry.arxivId); // Make sure both exist
    
    return processedEntries;
    
  } catch (error) {
    console.error('Error fetching arXiv data:', error.message);
    throw error;
  }
}

// Function to print entries (for standalone use)
function printEntries(entries) {
  console.log(`Total entries: ${entries.length}`);
  console.log('=================================\n');
  
  entries.forEach((entry, index) => {
    console.log(`${index + 1}. Title: ${entry.title}`);
    console.log(`   ArXiv ID: ${entry.arxivId}`);
    console.log(`   Published: ${entry.published}`);
    console.log(`   PDF URL: ${entry.pdfUrl}`);
    console.log('');
  });
  
  console.log('\n=================================');
  console.log(`Total PDFs available: ${entries.length}`);
}

// Export the functions
module.exports = {
  fetchArxivEntries,
  printEntries
};

// If running this file directly, execute the listing
if (require.main === module) {
  console.log('Fetching data from arXiv API...\n');
  
  fetchArxivEntries({ filterLast24Hours: false })
    .then(entries => {
      printEntries(entries);
    })
    .catch(error => {
      console.error('Error:', error.message);
    });
}
