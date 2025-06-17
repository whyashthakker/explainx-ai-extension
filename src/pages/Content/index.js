console.log('ExplainX Content Script Running');

// Function to extract YouTube transcript
async function getYouTubeTranscript() {
  try {
    // Try to find transcript button
    const transcriptButton = document.querySelector('[aria-label*="transcript" i], [aria-label*="Show transcript" i]');
    
    if (transcriptButton) {
      transcriptButton.click();
      
      // Wait for transcript panel to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to extract transcript from the panel
      const transcriptElements = document.querySelectorAll('[data-testid="transcript-segment"], .ytd-transcript-segment-renderer');
      
      if (transcriptElements.length > 0) {
        const transcript = Array.from(transcriptElements).map(element => {
          const text = element.textContent || element.innerText;
          return text.trim();
        }).filter(text => text.length > 0).join('\n');
        
        return transcript;
      }
    }
    
    // Alternative method: Try to find transcript in page data
    const scripts = document.querySelectorAll('script');
    for (let script of scripts) {
      if (script.textContent && script.textContent.includes('captionTracks')) {
        try {
          const match = script.textContent.match(/"captionTracks":\s*(\[.*?\])/);
          if (match) {
            const captionTracks = JSON.parse(match[1]);
            if (captionTracks.length > 0) {
              const captionUrl = captionTracks[0].baseUrl;
              if (captionUrl) {
                const response = await fetch(captionUrl);
                const xmlText = await response.text();
                
                // Parse XML to extract text
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                const textElements = xmlDoc.querySelectorAll('text');
                
                const transcript = Array.from(textElements).map(element => 
                  element.textContent.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                ).join(' ');
                
                return transcript;
              }
            }
          }
        } catch (e) {
          console.error('Error parsing caption tracks:', e);
        }
      }
    }
    
    return 'No transcript available for this video.';
  } catch (error) {
    console.error('Error getting YouTube transcript:', error);
    return 'Error extracting transcript.';
  }
}

// Function to extract general page text
function getPageText() {
  try {
    // Remove script and style elements
    const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer, .sidebar, .ad');
    
    // Get main content areas
    const contentSelectors = [
      'main',
      'article',
      '.content',
      '.main-content',
      '.post-content',
      '.entry-content',
      'body'
    ];
    
    let mainContent = null;
    for (let selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        mainContent = element;
        break;
      }
    }
    
    if (!mainContent) {
      mainContent = document.body;
    }
    
    // Extract text content
    let textContent = mainContent.innerText || mainContent.textContent || '';
    
    // Clean up the text
    textContent = textContent
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    // Limit to first 5000 characters for performance
    if (textContent.length > 5000) {
      textContent = textContent.substring(0, 5000) + '...';
    }
    
    return textContent || 'No readable text found on this page.';
  } catch (error) {
    console.error('Error extracting page text:', error);
    return 'Error extracting page content.';
  }
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'getContent') {
    const isYouTube = window.location.hostname.includes('youtube.com');
    
    if (isYouTube) {
      // Get YouTube transcript
      getYouTubeTranscript().then(transcript => {
        sendResponse({
          type: 'youtube',
          content: transcript,
          url: window.location.href,
          title: document.title
        });
      }).catch(error => {
        sendResponse({
          type: 'youtube',
          content: 'Error getting transcript: ' + error.message,
          url: window.location.href,
          title: document.title
        });
      });
    } else {
      // Get general page text
      const pageText = getPageText();
      sendResponse({
        type: 'page',
        content: pageText,
        url: window.location.href,
        title: document.title
      });
    }
    
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'getTranscript') {
    getYouTubeTranscript().then(transcript => {
      sendResponse({
        type: 'youtube',
        content: transcript,
        url: window.location.href,
        title: document.title
      });
    }).catch(error => {
      sendResponse({
        type: 'youtube',
        content: 'Error getting transcript: ' + error.message,
        url: window.location.href,
        title: document.title
      });
    });
    
    return true; // Keep the message channel open for async response
  }
});

// Initialize
console.log('Content script loaded for:', window.location.href);
