console.log('ExplainX Content Script Running');

const loader = chrome.runtime.getURL('loading.gif');
const logo = chrome.runtime.getURL('logo.png');

// Create floating action button
function createFloatingButton() {
  // Check if button already exists
  if (document.getElementById('explainx-floating-btn')) {
    return;
  }

  const button = document.createElement('div');
  button.id = 'explainx-floating-btn';
  button.innerHTML = `
    <div class="explainx-btn-content">
      <img src="${logo}" alt="ExplainX Logo" class="" style="width: 24px; height: 24px;" />
      <span class="explainx-btn-text">Extract</span>
    </div>
  `;

  // Loom-like Styling
  button.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    background: #fff;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10000;
    box-shadow: 0 2px 12px rgba(124, 58, 237, 0.18);
    border: 1.5px solid #e0e7ef;
    transition: all 0.22s cubic-bezier(.4,0,.2,1);
    color: #7c3aed;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    user-select: none;
  `;

  const btnContent = button.querySelector('.explainx-btn-content');
  btnContent.style.cssText = `
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 8px;
    width: 100%;
    height: 100%;
  `;

  const btnText = button.querySelector('.explainx-btn-text');
  btnText.style.cssText = `
    font-size: 13px;
    font-weight: 700;
    margin: 0;
    line-height: 1;
    letter-spacing: 0.01em;
    color: #7c3aed;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    opacity: 0;
    transition: opacity 0.18s, width 0.18s;
    white-space: nowrap;
    overflow: hidden;
    width: 0;
  `;

  // Show text on hover (desktop)
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.08)';
    button.style.boxShadow = '0 4px 18px rgba(124, 58, 237, 0.22)';
    btnText.style.width = 'auto';
    btnText.style.opacity = '1';
    btnContent.style.justifyContent = 'center';
    btnContent.style.alignItems = 'center';
    button.style.width = '120px';
    btnContent.style.gap = '10px';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 2px 12px rgba(124, 58, 237, 0.18)';
    btnText.style.width = '0';
    btnText.style.opacity = '0';
    button.style.width = '56px';
    btnContent.style.justifyContent = 'center';
    btnContent.style.alignItems = 'center';
    btnContent.style.gap = '8px';
  });

  // Drag functionality variables
  let isDragging = false;
  let hasDragged = false;
  let dragOffset = { x: 0, y: 0 };
  let startPos = { x: 0, y: 0 };

  // Mouse down handler
  button.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    hasDragged = false;
    dragOffset.x = e.clientX - button.getBoundingClientRect().left;
    dragOffset.y = e.clientY - button.getBoundingClientRect().top;
    startPos.x = e.clientX;
    startPos.y = e.clientY;
    button.style.cursor = 'grabbing';
  });

  // Mouse move handler
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const moveDistance = Math.sqrt(
        Math.pow(e.clientX - startPos.x, 2) +
        Math.pow(e.clientY - startPos.y, 2)
      );

      // Only start dragging if moved more than 5px
      if (moveDistance > 5) {
        hasDragged = true;
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        // Constrain to right side of screen (right 50% of viewport)
        const minX = window.innerWidth / 2;
        const maxX = window.innerWidth - button.offsetWidth;
        const minY = 0;
        const maxY = window.innerHeight - button.offsetHeight;

        const constrainedX = Math.max(minX, Math.min(maxX, newX));
        const constrainedY = Math.max(minY, Math.min(maxY, newY));

        button.style.left = `${constrainedX}px`;
        button.style.top = `${constrainedY}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
      }
    }
  });

  // Mouse up handler
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      button.style.cursor = 'pointer';
    }
  });

  // Click handler
  button.addEventListener('click', () => {
    if (!hasDragged) {
      handleExtractContent();
    }
  });

  document.body.appendChild(button);
  console.log('ExplainX floating button created');
}

// Show loading state
function showLoadingState() {
  const button = document.getElementById('explainx-floating-btn');
  if (button) {
    button.style.background = '#fff';
    button.innerHTML = `
      <div class="explainx-btn-content">
        <img src="${loader}" alt="ExplainX Logo" class="" style="width: 24px; height: 24px;" />
        <span class="explainx-btn-text">Loading...</span>
      </div>
    `;
    const btnContent = button.querySelector('.explainx-btn-content');
    btnContent.style.display = 'flex';
    btnContent.style.flexDirection = 'row';
    btnContent.style.alignItems = 'center';
    btnContent.style.justifyContent = 'center';
    btnContent.style.textAlign = 'center';
    btnContent.style.gap = '8px';
    btnContent.style.width = '100%';
    btnContent.style.height = '100%';
    const btnText = button.querySelector('.explainx-btn-text');
    btnText.style.fontSize = '13px';
    btnText.style.fontWeight = '700';
    btnText.style.margin = '0';
    btnText.style.lineHeight = '1';
    btnText.style.letterSpacing = '0.01em';
    btnText.style.color = '#7c3aed';
    btnText.style.display = 'flex';
    btnText.style.alignItems = 'center';
    btnText.style.justifyContent = 'center';
    btnText.style.height = '100%';
    btnText.style.opacity = '0';
    btnText.style.transition = 'opacity 0.18s, width 0.18s';
    btnText.style.whiteSpace = 'nowrap';
    btnText.style.overflow = 'hidden';
    btnText.style.width = '0';

    // Add hover effects for loading state
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.08)';
      button.style.boxShadow = '0 4px 18px rgba(124, 58, 237, 0.22)';
      btnText.style.width = 'auto';
      btnText.style.opacity = '1';
      btnContent.style.justifyContent = 'center';
      btnContent.style.alignItems = 'center';
      button.style.width = '120px';
      btnContent.style.gap = '10px';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 2px 12px rgba(124, 58, 237, 0.18)';
      btnText.style.width = '0';
      btnText.style.opacity = '0';
      button.style.width = '56px';
      btnContent.style.justifyContent = 'center';
      btnContent.style.alignItems = 'center';
      btnContent.style.gap = '8px';
    });
  }
}

// Show success state
function showSuccessState() {
  const button = document.getElementById('explainx-floating-btn');
  if (button) {
    button.id = 'explainx-floating-btn';
    button.innerHTML = `
      <div class="explainx-btn-content">
        <img src="${logo}" alt="ExplainX Logo" class="" style="width: 24px; height: 24px;" />
        <span class="explainx-btn-text">Extracted</span>
      </div>
    `;
    const btnContent = button.querySelector('.explainx-btn-content');
    btnContent.style.display = 'flex';
    btnContent.style.flexDirection = 'row';
    btnContent.style.alignItems = 'center';
    btnContent.style.justifyContent = 'center';
    btnContent.style.textAlign = 'center';
    btnContent.style.gap = '8px';
    btnContent.style.width = '100%';
    btnContent.style.height = '100%';
    const btnText = button.querySelector('.explainx-btn-text');
    btnText.style.fontSize = '13px';
    btnText.style.fontWeight = '700';
    btnText.style.margin = '0';
    btnText.style.lineHeight = '1';
    btnText.style.letterSpacing = '0.01em';
    btnText.style.color = '#7c3aed';
    btnText.style.display = 'flex';
    btnText.style.alignItems = 'center';
    btnText.style.justifyContent = 'center';
    btnText.style.height = '100%';
    btnText.style.opacity = '0';
    btnText.style.transition = 'opacity 0.18s, width 0.18s';
    btnText.style.whiteSpace = 'nowrap';
    btnText.style.overflow = 'hidden';
    btnText.style.width = '0';

    // Add hover effects for success state
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.08)';
      button.style.boxShadow = '0 4px 18px rgba(124, 58, 237, 0.22)';
      btnText.style.width = 'auto';
      btnText.style.opacity = '1';
      btnContent.style.justifyContent = 'center';
      btnContent.style.alignItems = 'center';
      button.style.width = '120px';
      btnContent.style.gap = '10px';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 2px 12px rgba(124, 58, 237, 0.18)';
      btnText.style.width = '0';
      btnText.style.opacity = '0';
      button.style.width = '56px';
      btnContent.style.justifyContent = 'center';
      btnContent.style.alignItems = 'center';
      btnContent.style.gap = '8px';
    });

    // Reset after 2 seconds
    setTimeout(() => {
      resetButtonState();
    }, 2000);
  }
}

// Show error state
function showErrorState() {
  const button = document.getElementById('explainx-floating-btn');
  if (button) {
    button.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    button.innerHTML = `
      <div class="explainx-btn-content">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
        <span class="explainx-btn-text">Error</span>
      </div>
    `;

    // Reset after 3 seconds
    setTimeout(() => {
      resetButtonState();
    }, 3000);
  }
}

// Reset button to initial state
function resetButtonState() {
  const button = document.getElementById('explainx-floating-btn');
  if (button) {
    button.style.background = '#fff';
    button.innerHTML = `
      <div class="explainx-btn-content">
        <img src="${logo}" alt="ExplainX Logo" class="" style="width: 24px; height: 24px;" />
        <span class="explainx-btn-text">Extract</span>
      </div>
    `;
    const btnContent = button.querySelector('.explainx-btn-content');
    btnContent.style.display = 'flex';
    btnContent.style.flexDirection = 'row';
    btnContent.style.alignItems = 'center';
    btnContent.style.justifyContent = 'center';
    btnContent.style.textAlign = 'center';
    btnContent.style.gap = '8px';
    btnContent.style.width = '100%';
    btnContent.style.height = '100%';
    const btnText = button.querySelector('.explainx-btn-text');
    btnText.style.fontSize = '13px';
    btnText.style.fontWeight = '700';
    btnText.style.margin = '0';
    btnText.style.lineHeight = '1';
    btnText.style.letterSpacing = '0.01em';
    btnText.style.color = '#7c3aed';
    btnText.style.display = 'flex';
    btnText.style.alignItems = 'center';
    btnText.style.justifyContent = 'center';
    btnText.style.height = '100%';
    btnText.style.opacity = '0';
    btnText.style.transition = 'opacity 0.18s, width 0.18s';
    btnText.style.whiteSpace = 'nowrap';
    btnText.style.overflow = 'hidden';
    btnText.style.width = '0';
  }
}

// Handle content extraction when button is clicked
async function handleExtractContent() {
  console.log('ExplainX extract button clicked');
  showLoadingState();

  try {
    const isYouTube = window.location.hostname.includes('youtube.com');
    let extractedData;

    if (isYouTube) {
      console.log('Extracting YouTube transcript...');
      const transcript = await getYouTubeTranscript();
      extractedData = {
        type: 'youtube',
        content: transcript,
        url: window.location.href,
        title: document.title,
        timestamp: Date.now()
      };
    } else {
      console.log('Extracting page content...');
      const pageText = getPageText();
      extractedData = {
        type: 'page',
        content: pageText,
        url: window.location.href,
        title: document.title,
        timestamp: Date.now()
      };
    }

    // Store in local storage
    chrome.storage.local.set({ 'explainx_extracted_content': extractedData }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error storing content:', chrome.runtime.lastError);
        showErrorState();
      } else {
        console.log('Content stored successfully');
        showSuccessState();

        // Notify background script
        chrome.runtime.sendMessage({
          action: 'contentExtracted',
          data: extractedData
        });

        // Open the extension popup after extraction
        chrome.runtime.sendMessage({ action: 'openPopup' });
      }
    });

  } catch (error) {
    console.error('Error extracting content:', error);
    showErrorState();
  }
}

// Function to extract YouTube transcript with multiple methods
async function getYouTubeTranscript() {
  try {
    console.log('Attempting to extract YouTube transcript...');

    // Method 1: Try to find and click transcript button
    const transcriptSelectors = [
      'button[aria-label*="transcript" i]',
      'button[aria-label*="Show transcript" i]',
      'button[data-testid="transcript-button"]',
      '.ytd-transcript-button-renderer button',
      'ytd-menu-service-item-renderer:has([data-testid="transcript"])',
      'tp-yt-paper-item:contains("Show transcript")'
    ];

    let transcriptButton = null;
    for (const selector of transcriptSelectors) {
      transcriptButton = document.querySelector(selector);
      if (transcriptButton) break;
    }

    if (transcriptButton) {
      console.log('Found transcript button, clicking...');
      transcriptButton.click();

      // Wait for transcript panel to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Try to extract transcript from the panel
      const transcriptElementSelectors = [
        '[data-testid="transcript-segment"]',
        '.ytd-transcript-segment-renderer',
        '.ytd-transcript-segment-list-renderer .segment',
        'ytd-transcript-body-renderer .segment-text'
      ];

      let transcriptElements = [];
      for (const selector of transcriptElementSelectors) {
        transcriptElements = document.querySelectorAll(selector);
        if (transcriptElements.length > 0) break;
      }

      if (transcriptElements.length > 0) {
        console.log(`Found ${transcriptElements.length} transcript segments`);
        const transcript = Array.from(transcriptElements).map(element => {
          const text = element.textContent || element.innerText;
          return text.trim();
        }).filter(text => text.length > 0).join('\n');

        if (transcript) {
          console.log('Successfully extracted transcript from UI');
          return transcript;
        }
      }
    }

    // Method 2: Try to find transcript in page scripts
    console.log('Attempting to extract transcript from page data...');
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
                console.log('Found caption URL, fetching...');
                const response = await fetch(captionUrl);
                const xmlText = await response.text();

                // Parse XML to extract text
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                const textElements = xmlDoc.querySelectorAll('text');

                const transcript = Array.from(textElements).map(element =>
                  element.textContent.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                ).join(' ');

                if (transcript) {
                  console.log('Successfully extracted transcript from caption data');
                  return transcript;
                }
              }
            }
          }
        } catch (e) {
          console.error('Error parsing caption tracks:', e);
        }
      }
    }

    return 'No transcript available for this video. This video may not have captions enabled or may be age-restricted.';
  } catch (error) {
    console.error('Error getting YouTube transcript:', error);
    return 'Error extracting transcript: ' + error.message;
  }
}

// Function to extract general page text with better content detection
function getPageText() {
  try {
    console.log('Extracting page text content...');

    // Get main content areas with better selectors
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '.main-content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '#content',
      '.page-content',
      'body'
    ];

    let mainContent = null;
    for (let selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        mainContent = element;
        console.log(`Found main content using selector: ${selector}`);
        break;
      }
    }

    if (!mainContent) {
      mainContent = document.body;
    }

    // Clone the element to avoid modifying the original
    const contentClone = mainContent.cloneNode(true);

    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer',
      '.sidebar', '.ad', '.advertisement', '.social-share',
      '.comments', '.comment', '.popup', '.modal',
      '[role="banner"]', '[role="navigation"]', '[role="complementary"]',
      '#explainx-floating-btn' // Remove our own button from extraction
    ];

    unwantedSelectors.forEach(selector => {
      const elements = contentClone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    // Extract text content
    let textContent = contentClone.innerText || contentClone.textContent || '';

    // Clean up the text
    textContent = textContent
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Limit to first 8000 characters for better performance
    if (textContent.length > 8000) {
      textContent = textContent.substring(0, 8000) + '...';
    }

    console.log(`Extracted ${textContent.length} characters of text content`);
    return textContent || 'No readable text found on this page.';
  } catch (error) {
    console.error('Error extracting page text:', error);
    return 'Error extracting page content: ' + error.message;
  }
}

// Message listener for popup requests
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  console.log('Content script received message:', request);

  if (request.action === 'getStoredContent') {
    // Popup is requesting stored content
    chrome.storage.local.get(['explainx_extracted_content'], (result) => {
      sendResponse(result.explainx_extracted_content || null);
    });
    return true;
  }
});

// Initialize when page loads
function initialize() {
  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingButton);
  } else {
    createFloatingButton();
  }

  // Also create button after a short delay to ensure page is fully loaded
  setTimeout(createFloatingButton, 2000);
}

// Initialize
console.log('Content script loaded for:', window.location.href);
console.log('ExplainX extension is ready to extract content!');
initialize();
