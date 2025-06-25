import React, { useState, useEffect } from 'react';
import logo from '../../assets/img/icon-128.png';
import './Popup.css';

const Popup = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageInfo, setPageInfo] = useState({
    title: '',
    url: '',
    type: '',
    timestamp: null,
  });
  const [hasStoredContent, setHasStoredContent] = useState(false);

  // Add authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getAuthStatus' }, resolve);
      });

      setIsAuthenticated(response.isAuthenticated);
      setUser(response.user);
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  // Handle login
  const handleLogin = async () => {
    setAuthLoading(true);
    try {
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'initiateAuth' }, (response) => {
          if (response.success) {
            resolve();
          } else {
            reject(new Error(response.error));
          }
        });
      });
    } catch (error) {
      setError('Authentication failed: ' + error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'logout' }, resolve);
      });
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      setError('Logout failed: ' + error.message);
    }
  };

  const fetchStoredContent = async () => {
    setLoading(true);
    setError('');

    try {
      // Get stored content from local storage
      const response = await new Promise((resolve, reject) => {
        chrome.storage.local.get(['explainx_extracted_content'], (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result.explainx_extracted_content);
          }
        });
      });

      if (response) {
        setContent(response.content);
        setPageInfo({
          title: response.title,
          url: response.url,
          type: response.type,
          timestamp: response.timestamp,
        });
        setHasStoredContent(true);
      } else {
        setContent('');
        setPageInfo({ title: '', url: '', type: '', timestamp: null });
        setHasStoredContent(false);
        setError(
          'No content extracted yet. Click the floating "Extract" button on any webpage to capture content.'
        );
      }
    } catch (err) {
      setError('Error: ' + err.message);
      console.error('Error fetching stored content:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearStoredContent = async () => {
    try {
      await new Promise((resolve, reject) => {
        chrome.storage.local.remove(['explainx_extracted_content'], () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });

      setContent('');
      setPageInfo({ title: '', url: '', type: '', timestamp: null });
      setHasStoredContent(false);
      setError(
        'Content cleared. Use the floating button to extract new content.'
      );
    } catch (err) {
      setError('Error clearing content: ' + err.message);
    }
  };

  useEffect(() => {
    checkAuthStatus();
    fetchStoredContent();

    // Listen for auth changes
    const handleStorageChange = (changes, namespace) => {
      if (namespace === 'local') {
        if (changes.access_token || changes.user_info) {
          checkAuthStatus();
        }
        if (changes.explainx_extracted_content) {
          fetchStoredContent();
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        alert('Content copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
      });
  };

  const refreshContent = () => {
    fetchStoredContent();
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const openSourceUrl = () => {
    if (pageInfo.url) {
      chrome.tabs.create({ url: pageInfo.url });
    }
  };

  return (
    <div className="popup-container">
      <header className="popup-header">
        <img src={logo} className="popup-logo" alt="ExplainX Logo" />
        <h1 className="popup-title">ExplainX</h1>
      </header>

      <div className="popup-content">
        {/* Authentication Section */}
        <div className="auth-section">
          {isAuthenticated ? (
            <div className="user-info">
              <div className="user-details">
                <span>👋 {user?.name || user?.email}</span>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="login-section">
              <p>
                Connect your ExplainX account to sync your extracted content
              </p>
              <button
                onClick={handleLogin}
                className="login-btn"
                disabled={authLoading}
              >
                {authLoading ? 'Connecting...' : 'Connect Account'}
              </button>
            </div>
          )}
        </div>

        {pageInfo.title && (
          <div className="page-info">
            <h3 className="page-title" title={pageInfo.title}>
              {pageInfo.title}
            </h3>
            <p className="page-type">
              {pageInfo.type === 'youtube' ? '📹 YouTube Video' : '📄 Web Page'}
            </p>
            {pageInfo.timestamp && (
              <p className="page-timestamp">
                Extracted: {formatTimestamp(pageInfo.timestamp)}
              </p>
            )}
            {pageInfo.url && (
              <button onClick={openSourceUrl} className="source-link-btn">
                🔗 Open Source
              </button>
            )}
          </div>
        )}

        <div className="content-actions">
          <button
            onClick={refreshContent}
            className="action-btn refresh-btn"
            disabled={loading}
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
          {content && (
            <>
              <button onClick={copyToClipboard} className="action-btn copy-btn">
                📋 Copy
              </button>
              <button
                onClick={clearStoredContent}
                className="action-btn clear-btn"
              >
                🗑️ Clear
              </button>
            </>
          )}
        </div>

        <div className="content-area">
          {loading && (
            <div className="loading-message">
              <p>Loading stored content...</p>
            </div>
          )}

          {error && (
            <div className="error-message">
              <p>ℹ️ {error}</p>
              {!hasStoredContent && (
                <div className="instructions">
                  <h4>How to use ExplainX:</h4>
                  <ol>
                    <li>Go to any webpage or YouTube video</li>
                    <li>Look for the floating purple "Extract" button</li>
                    <li>Click it to extract content</li>
                    <li>Return here to view the extracted content</li>
                  </ol>
                </div>
              )}
              <button onClick={refreshContent} className="retry-btn">
                Check Again
              </button>
            </div>
          )}

          {content && !loading && (
            <div className="content-display">
              <div className="content-text">{content}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Popup;
