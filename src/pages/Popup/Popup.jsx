import React, { useState, useEffect } from 'react';
import logo from '../../assets/img/icon-128.png';
import Spaces from '../../components/Spaces';
import Content from '../../components/Content';
import './Popup.css';
import { DEV_MODE } from '../Constants/';
import { BookCheck, Box, Settings } from 'lucide-react';

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

  // Add view state for tabs - now includes settings
  const [activeTab, setActiveTab] = useState('content'); // 'content', 'spaces', or 'settings'

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
      {/* Minimal header - always visible */}
      <header className="popup-header minimal-popup-header">
        <img src={logo} className="popup-logo minimal-popup-logo" alt="ExplainX Logo" />
        <h1 className="popup-title minimal-popup-title">ExplainX</h1>

        {/* Quick status indicator when authenticated */}
        {isAuthenticated && (
          <div className="quick-status-indicator">
            <div className="status-dot" title={`Logged in as ${user?.name || user?.email}`}></div>
          </div>
        )}
      </header>

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
            {/* Compact Navigation Tabs with Settings */}
            <div className="tab-navigation ultra-compact-tab-navigation">
              <button
                className={`tab-btn ultra-compact-tab-btn ${activeTab === 'content' ? 'active' : ''}`}
                onClick={() => setActiveTab('content')}
              >
                <BookCheck size={14} />
                Content
              </button>
              <button
                className={`tab-btn ultra-compact-tab-btn ${activeTab === 'spaces' ? 'active' : ''}`}
                onClick={() => setActiveTab('spaces')}
                disabled={!isAuthenticated}
              >
                <Box size={14} /> Spaces
              </button>
              <button
                className={`tab-btn ultra-compact-tab-btn settings-tab ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
                title="Settings & Account"
              >
                <Settings size={14} />
              </button>
            </div>

            {/* Content Tab */}
            {activeTab === 'content' && (
              <>
                <Content onSaveToSpace={() => setActiveTab('spaces')} />
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

            {/* Settings Tab */}
            {activeTab === 'settings' && isAuthenticated && (
              <div className="settings-tab-content">
                <div className="settings-container">
                  {/* User Profile Section */}
                  <div className="settings-section">
                    <h3 className="settings-section-title">👤 Account</h3>
                    <div className="user-profile-card">
                      <div className="user-profile-avatar">
                        {user?.avatarUrl ? (
                          <img src={user.avatarUrl} alt="avatar" />
                        ) : (
                          <span>{user?.name ? user.name[0].toUpperCase() : '👤'}</span>
                        )}
                      </div>
                      <div className="user-profile-info">
                        <div className="user-profile-name">
                          {user?.name || 'Anonymous User'}
                        </div>
                        <div className="user-profile-email">
                          {user?.email || 'No email provided'}
                        </div>
                        <div className="user-profile-stats">
                          <span className="profile-stat">
                            📚 {user?.totalSpaces || 0} spaces
                          </span>
                          <span className="profile-stat">
                            📄 {user?.totalStudyMaterials || 0} materials
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="settings-section">
                    <h3 className="settings-section-title">🔄 Actions</h3>
                    <div className="settings-actions">
                      <button
                        onClick={syncUserData}
                        className="settings-action-btn"
                        disabled={syncLoading}
                      >
                        <span className="action-icon">🔄</span>
                        <div className="action-content">
                          <div className="action-title">
                            {syncLoading ? 'Syncing...' : 'Sync Data'}
                          </div>
                          <div className="action-description">
                            Refresh your spaces and materials
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={openOptionsPage}
                        className="settings-action-btn"
                      >
                        <span className="action-icon">🛠️</span>
                        <div className="action-content">
                          <div className="action-title">Extension Settings</div>
                          <div className="action-description">
                            Configure extension preferences
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={handleLogout}
                        className="settings-action-btn logout-action"
                      >
                        <span className="action-icon">🚪</span>
                        <div className="action-content">
                          <div className="action-title">Logout</div>
                          <div className="action-description">
                            Sign out of your account
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* App Info Section */}
                  <div className="settings-section">
                    <h3 className="settings-section-title">ℹ️ About</h3>
                    <div className="app-info">
                      <div className="info-item">
                        <span className="info-label">Version:</span>
                        <span className="info-value">1.0.0</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Environment:</span>
                        <span className="info-value">{isDev ? 'Development' : 'Production'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Popup;