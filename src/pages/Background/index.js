import { DEV_MODE } from '../Constants/index.js';

console.log('ExplainX Extension Background Script Running');

const apiUrl = DEV_MODE ? 'http://localhost:3000' : 'https://learn.explainx.ai';
// const apiUrl = 'http://localhost:3000'

const OAUTH_CONFIG = {
  clientId: 'explainx-extension',
  authUrl: `${apiUrl}/api/auth/extension/authorize`, // Your Next.js app
  tokenUrl: `${apiUrl}/api/auth/extension/token`,
  revokeUrl: `${apiUrl}/api/auth/extension/revoke`,
};

// Generate random state for CSRF protection
function generateState() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

// Handle auth initiation with tab monitoring
async function initiateAuth() {
  try {
    const state = generateState();

    // Store state temporarily
    await chrome.storage.local.set({ oauth_state: state });

    // Build auth URL - use dynamic API URL for redirect URI
    const redirectUri = `${apiUrl}/extension-auth-success`;
    const authUrl =
      `${OAUTH_CONFIG.authUrl}?` +
      new URLSearchParams({
        client_id: OAUTH_CONFIG.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        state: state,
        scope: 'profile',
      });

    console.log('Opening auth URL:', authUrl);

    // Create new tab for authentication
    const authTab = await chrome.tabs.create({
      url: authUrl,
      active: true,
    });

    // Monitor the tab for redirect to success page
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const tab = await chrome.tabs.get(authTab.id);

          // Check if tab was closed by user
          if (!tab) {
            clearInterval(checkInterval);
            reject(new Error('Authorization cancelled by user'));
            return;
          }

          // Check if we reached the success page using dynamic API URL
          if (
            tab.url &&
            tab.url.startsWith(`${apiUrl}/extension-auth-success`)
          ) {
            clearInterval(checkInterval);

            // Extract code and state from URL
            const url = new URL(tab.url);
            const code = url.searchParams.get('code');
            const returnedState = url.searchParams.get('state');

            // Close the auth tab
            // chrome.tabs.remove(authTab.id);

            if (code && returnedState) {
              // Exchange code for token
              exchangeCodeForToken(code, returnedState)
                .then(resolve)
                .catch(reject);
            } else {
              reject(new Error('Missing authorization code or state'));
            }
          }
        } catch (error) {
          // Tab might have been closed
          clearInterval(checkInterval);
          reject(new Error('Authorization tab was closed'));
        }
      }, 1000); // Check every second

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        chrome.tabs.remove(authTab.id).catch(() => { }); // Ignore errors if tab already closed
        reject(new Error('Authorization timeout'));
      }, 5 * 60 * 1000);
    });
  } catch (error) {
    console.error('Error initiating auth:', error);
    throw error;
  }
}

// Handle token exchange
async function exchangeCodeForToken(code, state) {
  try {
    console.log('Exchanging code for token...');

    // Verify state
    const stored = await chrome.storage.local.get(['oauth_state']);
    if (stored.oauth_state !== state) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    // Exchange code for token using dynamic API URL for redirect URI
    const response = await fetch(OAUTH_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: OAUTH_CONFIG.clientId,
        code: code,
        redirect_uri: `${apiUrl}/extension-auth-success`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await response.json();

    if (response.ok) {
      console.log('Token exchange successful');

      // Store tokens
      await chrome.storage.local.set({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + tokenData.expires_in * 1000,
        user_info: tokenData.user,
      });

      // Clean up
      await chrome.storage.local.remove(['oauth_state']);

      // Notify popup if it's open
      try {
        chrome.runtime.sendMessage({
          action: 'authSuccess',
          user: tokenData.user,
        });
      } catch (error) {
        // Popup might not be open, that's okay
      }

      return { success: true, user: tokenData.user };
    } else {
      throw new Error(tokenData.error || 'Token exchange failed');
    }
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
}

// Check if token is expired and refresh if needed
async function ensureValidToken() {
  try {
    const stored = await chrome.storage.local.get([
      'access_token',
      'refresh_token',
      'expires_at',
    ]);

    if (!stored.access_token) {
      return null; // No token stored
    }

    // Check if token expires in the next 5 minutes
    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
    if (stored.expires_at && stored.expires_at > fiveMinutesFromNow) {
      return stored.access_token; // Token is still valid
    }

    // Need to refresh token
    if (!stored.refresh_token) {
      // No refresh token, need to re-authenticate
      await chrome.storage.local.remove([
        'access_token',
        'refresh_token',
        'expires_at',
        'user_info',
      ]);
      return null;
    }

    console.log('Refreshing access token...');

    const response = await fetch(OAUTH_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: OAUTH_CONFIG.clientId,
        grant_type: 'refresh_token',
        refresh_token: stored.refresh_token,
      }),
    });

    const tokenData = await response.json();

    if (response.ok) {
      // Update stored token
      await chrome.storage.local.set({
        access_token: tokenData.access_token,
        expires_at: Date.now() + tokenData.expires_in * 1000,
      });

      return tokenData.access_token;
    } else {
      // Refresh failed, clear all tokens
      await chrome.storage.local.remove([
        'access_token',
        'refresh_token',
        'expires_at',
        'user_info',
      ]);
      return null;
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

// Handle logout
async function handleLogout() {
  try {
    const stored = await chrome.storage.local.get(['refresh_token']);

    // Revoke token on server if available
    if (stored.refresh_token) {
      try {
        await fetch(OAUTH_CONFIG.revokeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: stored.refresh_token,
            token_type_hint: 'refresh_token',
          }),
        });
      } catch (error) {
        console.error('Token revocation failed:', error);
        // Continue with local logout even if server revocation fails
      }
    }

    // Clear local storage
    await chrome.storage.local.remove([
      'access_token',
      'refresh_token',
      'expires_at',
      'user_info',
    ]);

    console.log('Logout successful');
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  // Original content extraction handlers
  if (request.action === 'contentExtracted') {
    console.log('Content extracted and stored:', request.data);

    chrome.action.setBadgeText({
      text: '1',
      tabId: sender.tab?.id,
    });

    chrome.action.setBadgeBackgroundColor({
      color: '#10b981',
    });

    setTimeout(() => {
      chrome.action.setBadgeText({
        text: '',
        tabId: sender.tab?.id,
      });
    }, 5000);

    sendResponse({ success: true });
  }

  if (request.action === 'getStoredContent') {
    chrome.storage.local.get(['explainx_extracted_content'], (result) => {
      sendResponse(result.explainx_extracted_content || null);
    });
    return true;
  }

  if (request.action === 'clearStoredContent') {
    chrome.storage.local.remove(['explainx_extracted_content'], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // OAuth handlers
  if (request.action === 'initiateAuth') {
    initiateAuth()
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'getAuthStatus') {
    ensureValidToken()
      .then((token) => {
        chrome.storage.local.get(['user_info'], (result) => {
          sendResponse({
            isAuthenticated: !!token,
            user: result.user_info || null,
          });
        });
      })
      .catch((error) => {
        sendResponse({
          isAuthenticated: false,
          user: null,
        });
      });
    return true;
  }

  if (request.action === 'logout') {
    handleLogout()
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'makeAuthenticatedRequest') {
    ensureValidToken()
      .then((token) => {
        if (!token) {
          sendResponse({ success: false, error: 'Not authenticated' });
          return;
        }

        // Make the authenticated request
        fetch(request.url, {
          method: request.method || 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...request.headers,
          },
          body: request.body ? JSON.stringify(request.body) : undefined,
        })
          .then((response) => response.json())
          .then((data) => {
            sendResponse({ success: true, data });
          })
          .catch((error) => {
            sendResponse({ success: false, error: error.message });
          });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'openPopup') {
    // Try to open the extension popup (MV3)
    if (chrome.action && chrome.action.openPopup) {
      chrome.action.openPopup();
    } else {
      // Fallback: open popup.html in a new window
      chrome.windows.create({
        url: chrome.runtime.getURL('popup.html'),
        type: 'popup',
        width: 420,
        height: 600
      });
    }
    sendResponse({ success: true });
    return;
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
      tabId: tabId,
    });
  }
});
