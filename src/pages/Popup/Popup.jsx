import React, { useState, useEffect } from 'react';
import logo from '../../assets/img/icon-128.png';
import Spaces from '../../components/Spaces';
import './Popup.css';
import { DEV_MODE } from '../Constants/';
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
  const [syncLoading, setSyncLoading] = useState(false);

  // Add view state for tabs
  const [activeTab, setActiveTab] = useState('content'); // 'content' or 'spaces'

  // Configuration - Check if we're in development mode
  const isDev = DEV_MODE;
  const API_BASE_URL = isDev
    ? 'http://localhost:3000/api'
    : 'https://learn.explainx.ai/api';

  // Sync user data from server
  const syncUserData = async () => {
    if (!isAuthenticated) return;

    setSyncLoading(true);
    try {
      const result = await chrome.storage.local.get(['access_token']);
      const token = result.access_token;

      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/extension/sync`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid, clear auth
          await chrome.storage.local.remove(['access_token', 'user_info']);
          setIsAuthenticated(false);
          setUser(null);
          setError('Session expired. Please login again.');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Update user data in storage and state
      await chrome.storage.local.set({ user_info: data.user });
      setUser(data.user);

      console.log('User data synced:', data.user);
    } catch (err) {
      console.error('Error syncing user data:', err);
      setError('Failed to sync user data: ' + err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      const result = await chrome.storage.local.get([
        'access_token',
        'user_info',
      ]);
      const hasToken = !!result.access_token;
      const userInfo = result.user_info;

      setIsAuthenticated(hasToken);
      setUser(userInfo);
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
      await chrome.storage.local.remove(['access_token', 'user_info']);
      setIsAuthenticated(false);
      setUser(null);
      setActiveTab('content'); // Switch back to content tab
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

  // Sync user data when authentication status changes
  useEffect(() => {
    if (isAuthenticated && user) {
      // Sync user data on initial auth or when user changes
      syncUserData();
    }
  }, [isAuthenticated]);

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

  // Create current content object for Spaces component
  const currentContent = hasStoredContent
    ? {
        title: pageInfo.title,
        content: content,
        type: pageInfo.type,
        url: pageInfo.url,
        timestamp: pageInfo.timestamp,
      }
    : null;

  return (
    <div className="popup-container">
      <header className="popup-header">
        <img src={logo} className="popup-logo" alt="ExplainX Logo" />
        <h1 className="popup-title">ExplainX</h1>
      </header>

      <div className="popup-content">
        {/* Navigation Tabs */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            📄 Content
          </button>
          <button
            className={`tab-btn ${activeTab === 'spaces' ? 'active' : ''}`}
            onClick={() => setActiveTab('spaces')}
            disabled={!isAuthenticated}
          >
            📚 My Spaces
          </button>
        </div>

        {/* Authentication Section */}
        {!isAuthenticated && (
          <div className="auth-section">
            <div className="login-section">
              <p>
                Connect your ExplainX account to save content to your spaces
              </p>
              <button
                onClick={handleLogin}
                className="login-btn"
                disabled={authLoading}
              >
                {authLoading ? 'Connecting...' : 'Connect Account'}
              </button>
            </div>
          </div>
        )}

        {/* User Info Bar (when authenticated) */}
        {isAuthenticated && (
          <div className="user-info-bar">
            <div className="user-details">
              <div className="user-greeting-section">
                <span className="user-greeting">
                  👋 {user?.name || user?.email}
                </span>
                {user?.totalSpaces !== undefined && (
                  <div className="user-stats">
                    <span className="stat-item">
                      📚 {user.totalSpaces} spaces
                    </span>
                    <span className="stat-item">
                      📄 {user.totalStudyMaterials} materials
                    </span>
                  </div>
                )}
              </div>
              <div className="user-actions">
                <button
                  onClick={syncUserData}
                  className="sync-btn"
                  disabled={syncLoading}
                  title="Sync your data from server"
                >
                  {syncLoading ? '🔄' : '🔄'}
                </button>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <>
            {pageInfo.title && (
              <div className="page-info">
                <h3 className="page-title" title={pageInfo.title}>
                  {pageInfo.title}
                </h3>
                <p className="page-type">
                  {pageInfo.type === 'youtube'
                    ? '📹 YouTube Video'
                    : '📄 Web Page'}
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
                  <button
                    onClick={copyToClipboard}
                    className="action-btn copy-btn"
                  >
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
          </>
        )}

        {/* Spaces Tab */}
        {activeTab === 'spaces' && isAuthenticated && (
          <div className="spaces-tab-content">
            <Spaces
              currentContent={currentContent}
              onSpaceSelect={(space) => {
                console.log('Space selected:', space);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Popup;
