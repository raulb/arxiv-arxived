const axios = require('axios');
const xml2js = require('xml2js');

async function fetchArxivPdfLinks() {
  try {
    // Make the API request
    const url = 'https://export.arxiv.org/api/query?search_query=ti:%22AI%22+AND+cat:cs.AI&sortBy=submittedDate&sortOrder=descending&start=0&max_results=200';

    console.log('Fetching data from arXiv API...\n');
    
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
    const entriesArray = Array.isArray(entries) ? entries : [entries];    
    console.log(`Total entries: ${entriesArray.length}`);
    console.log('=================================\n');
    
    // Process each recent entry
    entriesArray.forEach((entry, index) => {
      // Get the PDF link
      const links = Array.isArray(entry.link) ? entry.link : [entry.link];
      const pdfLink = links.find(link => 
        link.type === 'application/pdf' || 
        (link.href && link.href.includes('/pdf/'))
      );
      
      if (pdfLink) {
        console.log(`${index + 1}. Title: ${entry.title}`);
        console.log(`   Published: ${entry.published}`);
        console.log(`   PDF URL: ${pdfLink.href}`);
        console.log('');
      }
    });
    
    // Summary
    console.log('\n=================================');
    console.log(`Total PDFs to download: ${entriesArray.length}`);
    
  } catch (error) {
    console.error('Error fetching arXiv data:', error.message);
  }
}

// Run the function
fetchArxivPdfLinks();
