console.log('ExplainX Extension Background Script Running');

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'contentExtracted') {
    // Content script has extracted and stored content
    console.log('Content extracted and stored:', request.data);
    
    // Optional: You could notify all open popups here
    // or update a badge on the extension icon
    chrome.action.setBadgeText({
      text: '1',
      tabId: sender.tab?.id
    });
    
    chrome.action.setBadgeBackgroundColor({
      color: '#10b981'
    });
    
    // Clear badge after 5 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({
        text: '',
        tabId: sender.tab?.id
      });
    }, 5000);
    
    sendResponse({ success: true });
  }
  
  if (request.action === 'getStoredContent') {
    // Popup is requesting stored content
    chrome.storage.local.get(['explainx_extracted_content'], (result) => {
      sendResponse(result.explainx_extracted_content || null);
    });
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'clearStoredContent') {
    // Clear stored content
    chrome.storage.local.remove(['explainx_extracted_content'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('ExplainX Extension installed:', details);
  
  // Clear any existing stored content on install/update
  chrome.storage.local.clear(() => {
    console.log('Cleared extension storage');
  });
});

// Handle tab updates to clear badge when navigating away
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    // Clear badge when navigating to a new page
    chrome.action.setBadgeText({
      text: '',
      tabId: tabId
    });
  }
});
