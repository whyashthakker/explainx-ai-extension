import React, { useState, useEffect } from 'react';
import logo from '../../assets/img/icon-128.png';
import Spaces from '../../components/Spaces';
import Content from '../../components/Content';
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

  const openOptionsPage = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
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
      {/* Show header only if authenticated */}
      {isAuthenticated && (
        <header className="popup-header compact-popup-header">
          <img src={logo} className="popup-logo compact-popup-logo" alt="ExplainX Logo" />
          <h1 className="popup-title compact-popup-title">ExplainX</h1>

        </header>
      )}
      <div className="popup-content">
        {/* Show only the welcome screen if not authenticated */}
        {!isAuthenticated ? (
          <div className="welcome-section" style={{ padding: '32px 0', textAlign: 'center' }}>
            <img
              src={logo}
              alt="Explainx Logo"
              style={{ width: 88, height: 88, borderRadius: 20, marginBottom: 24, boxShadow: '0 4px 24px rgba(59,130,246,0.10)' }}
            />
            <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px 0', color: '#22223b' }}>Welcome to ExplainX</h2>
            <div style={{ fontSize: 17, color: '#64748b', marginBottom: 32 }}>
              AI-powered social media assistant
            </div>
            <div style={{ maxWidth: 380, margin: '0 auto 32px auto', textAlign: 'left', background: '#f8fafc', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 18, color: '#22223b' }}>
                Streamline your learning engagement with ExplainX
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: '#14b8a6', fontWeight: 700, minWidth: 28 }}>01</span>
                  <div>
                    <span style={{ fontWeight: 700 }}>YouTube Summaries</span><br />
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Automatically summarize YouTube videos</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: '#14b8a6', fontWeight: 700, minWidth: 28 }}>02</span>
                  <div>
                    <span style={{ fontWeight: 700 }}>Smart Summaries</span><br />
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Generate contextual summaries in seconds</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: '#14b8a6', fontWeight: 700, minWidth: 28 }}>03</span>
                  <div>
                    <span style={{ fontWeight: 700 }}>Free & Premium Options</span><br />
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Start with basic features, upgrade when ready</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogin}
              className="button"
              disabled={authLoading}
              style={{ fontSize: 18, width: 320, maxWidth: '90%', margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}
            >
              {authLoading ? 'Connecting...' : 'Connect Account'}
            </button>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="tab-navigation compact-tab-navigation">
              <button
                className={`button button-white compact-tab-btn ${activeTab === 'content' ? 'active' : ''}`}
                onClick={() => setActiveTab('content')}
              >
                Content
              </button>
              <button
                className={`button button-white compact-tab-btn ${activeTab === 'spaces' ? 'active' : ''}`}
                onClick={() => setActiveTab('spaces')}
                disabled={!isAuthenticated}
              >
                My Spaces
              </button>
            </div>

            {/* User Info Bar (when authenticated) */}
            <div className="user-info-bar modern-user-info-bar ">
              <div className="modern-user-avatar">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" />
                ) : (
                  <span>{user?.name ? user.name[0].toUpperCase() : '👤'}</span>
                )}
              </div>
              <div className="user-greeting-section compact-user-greeting-section">
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
              <div className="user-actions modern-user-actions compact-user-actions">
                <button
                  onClick={syncUserData}
                  className="button button-neutral"
                  disabled={syncLoading}
                  title="Sync your data from server"
                >
                  {syncLoading ? 'Syncing...' : '🔄 Sync'}
                </button>
                <button onClick={handleLogout} className="button button-danger">
                  Logout
                </button>
              </div>
            </div>

            {/* Content Tab */}
            {activeTab === 'content' && (
              <>
                <Content />
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
          </>
        )}
      </div>
    </div>
  );
};

export default Popup;
