// src/components/Spaces/Spaces.jsx
import React, { useState, useEffect } from 'react';
import './Spaces.css';
import { DEV_MODE } from '../pages/Constants/';
import { Book, FileText, Globe, Lock, Save, Loader, RefreshCw, Search, X, CheckCircle, XCircle } from 'lucide-react';

const Spaces = ({ onSpaceSelect, currentContent, onContentSaved }) => {
  const [spaces, setSpaces] = useState([]);
  const [filteredSpaces, setFilteredSpaces] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [savingToSpace, setSavingToSpace] = useState(null);
  const [savedToSpace, setSavedToSpace] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [toast, setToast] = useState(null);
  const [shadToast, setShadToast] = useState(null);

  // Configuration
  const API_BASE_URL = DEV_MODE
    ? 'http://localhost:3000/api'
    : 'https://learn.explainx.ai/api';

  useEffect(() => {
    checkAuthAndLoadSpaces();
  }, []);

  // Function to show toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000); // Hide after 3 seconds
  };

  // Clear saved state when new content is available
  useEffect(() => {
    if (currentContent && savedToSpace) {
      setSavedToSpace(null);
    }
  }, [currentContent]);

  // Filter spaces based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSpaces(spaces);
    } else {
      const filtered = spaces.filter(space =>
        space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (space.description && space.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredSpaces(filtered);
    }
  }, [spaces, searchQuery]);

  // Handle search input
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  const checkAuthAndLoadSpaces = async () => {
    try {
      // Check if JWT token is stored
      const result = await chrome.storage.local.get(['access_token']);
      console.log(result);
      const storedToken = result.access_token;
      console.log(storedToken);

      if (storedToken) {
        setAuthToken(storedToken);
        console.log('JWT token found:', storedToken);
        await loadSpaces(storedToken);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error checking auth:', err);
      setLoading(false);
    }
  };

  const loadSpaces = async (tokenToUse = authToken) => {
    if (!tokenToUse) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      console.log('Loading spaces with token:', tokenToUse);

      const response = await fetch(`${API_BASE_URL}/extension/spaces`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenToUse}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setSpaces(data.spaces || []);
      setFilteredSpaces(data.spaces || []);
    } catch (err) {
      console.error('Error loading spaces:', err);
      setError(`Failed to load spaces: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced save function that creates study material directly
  const saveToSpace = async (space) => {
    if (!currentContent || !currentContent.content) {
      showToast('No content to save. Please extract content first.', 'error');
      return;
    }

    if (!authToken) {
      showToast('Please authenticate first.', 'error');
      return;
    }

    try {
      setSavingToSpace(space.id);

      // Prepare enhanced content data for the new API
      const contentData = {
        spaceId: space.id,
        title:
          currentContent.title ||
          `Extracted Content - ${new Date().toLocaleDateString()}`,
        content: currentContent.content,
        type: currentContent.type || 'page', // 'page', 'youtube', etc.
        sourceUrl: currentContent.url || window.location.href,
        description:
          currentContent.description ||
          `Content extracted from ${currentContent.type === 'youtube' ? 'YouTube video' : 'web page'
          } on ${new Date().toLocaleDateString()}`,
      };

      // Use the new direct content save API
      const response = await fetch(`${API_BASE_URL}/extension/study-material`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(contentData),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Save failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      // Show success message with more details
      setShadToast('Study material saved successfully!');
      setTimeout(() => setShadToast(null), 2500);
      currentContent = null;

      console.log('Content saved successfully:', result);
    } catch (err) {
      console.error('Error saving content:', err);

      // Enhanced error handling
      let errorMessage = 'Failed to save content';
      if (err.message.includes('Unauthorized')) {
        errorMessage = 'Authentication failed. Please log in again.';
        // Optionally clear the stored token
        chrome.storage.local.remove(['access_token']);
        setAuthToken(null);
      } else if (err.message.includes('Access denied')) {
        errorMessage =
          "You don't have permission to save content to this space.";
      } else if (err.message.includes('Missing required fields')) {
        errorMessage =
          'Some required information is missing. Please try extracting content again.';
      } else {
        errorMessage = `Save failed: ${err.message}`;
      }

      showToast('❌ ' + errorMessage, 'error');
    } finally {
      setSavingToSpace(null);
    }
  };

  // NEW: Function to test API connectivity
  const testConnection = async () => {
    if (!authToken) {
      showToast('No authentication token found.', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/extension/content`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        showToast(
          `✅ Connection successful!\nAuthenticated as: ${data.user.name || data.user.email
          }`,
          'success'
        );
      } else {
        showToast(
          '❌ Connection failed. Please check your authentication.',
          'error'
        );
      }
    } catch (err) {
      showToast(`❌ Connection test failed: ${err.message}`, 'error');
    }
  };

  return (
    <div className="spaces-container ultra-compact-spaces-container">
      <div className="spaces-header ultra-compact-spaces-header">
        <h3 className="ultra-compact-spaces-title"><Book size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />My Spaces</h3>
        <div className="header-actions ultra-compact-header-actions">
          <button
            onClick={async () => await loadSpaces(authToken)}
            className="button button-neutral ultra-compact-refresh-btn"
            disabled={loading}
            title="Refresh spaces"
          >
            {loading ? <Loader size={16} className="spin" /> : <RefreshCw size={16} />}
          </button>
        </div>
      </div>

      {/* Search bar */}
      {!loading && !error && spaces.length > 0 && (
        <div className="ultra-compact-search-container">
          <div className="ultra-compact-search-wrapper">
            <span className="ultra-compact-search-icon"><Search size={14} /></span>
            <input
              type="text"
              placeholder="Search spaces..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="ultra-compact-search-input"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="ultra-compact-search-clear"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="ultra-compact-search-results">
              {filteredSpaces.length} of {spaces.length} spaces
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="spaces-loading ultra-compact-loading">
          <p>Loading spaces...</p>
        </div>
      )}

      {error && (
        <div className="spaces-error ultra-compact-error">
          <p>{error}</p>
          <button onClick={loadSpaces} className="button button-danger ultra-compact-retry-btn">
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {spaces.length === 0 ? (
            <div className="no-spaces ultra-compact-no-spaces">
              <p>No spaces found.</p>
              <p className="no-spaces-hint">Create your first space in the web app!</p>
            </div>
          ) : filteredSpaces.length === 0 ? (
            <div className="no-spaces ultra-compact-no-spaces">
              <p>No spaces match your search.</p>
              <p className="no-spaces-hint">Try a different search term or clear the search.</p>
            </div>
          ) : (
            <div className="spaces-list ultra-compact-spaces-list">
              {filteredSpaces.map((space) => (
                <div key={space.id} className="space-item ultra-compact-space-item">
                  <div className="ultra-compact-space-left">
                    <div className="ultra-compact-space-name" title={space.name}>
                      {space.name}
                    </div>
                    <div className="ultra-compact-space-meta">
                      <span className="ultra-compact-visibility">
                        {space.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                      </span>
                      <span className="ultra-compact-materials">
                        <Book size={12} /> {space._count?.studyMaterials || 0}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => saveToSpace(space)}
                    className={`ultra-compact-save-btn ${!currentContent || savingToSpace === space.id
                      ? 'disabled'
                      : 'enabled'
                      }`}
                    disabled={!currentContent || savingToSpace === space.id}
                    title={
                      !currentContent
                        ? 'Extract content first'
                        : 'Save content as study material'
                    }
                  >
                    {savingToSpace === space.id ? <Loader size={16} className="spin" /> : <Save size={16} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Enhanced status indicator */}
      {currentContent && (
        <div className="content-status ultra-compact-content-status">
          <div className="ultra-compact-content-preview">
            <span className="ultra-compact-content-indicator"><FileText size={12} style={{ marginRight: 2, verticalAlign: 'middle' }} />Ready:</span>
            <span className="ultra-compact-content-title" title={currentContent.title || 'Untitled Content'}>
              {currentContent.title || 'Untitled Content'}
            </span>
            <span className="ultra-compact-content-size">
              ({(currentContent.content?.length || 0).toLocaleString()} chars)
            </span>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`toast ultra-compact-toast ${toast.type}`}>
          <div className="toast-content">
            <span className="toast-icon">
              {toast.type === 'success' ? <CheckCircle size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Shadcn-like toast */}
      {shadToast && (
        <div className="shadcn-toast">
          <span className="shadcn-toast-icon"><CheckCircle size={14} color="#10b981" /></span>
          <span className="shadcn-toast-message">{shadToast}</span>
        </div>
      )}
    </div>
  );
};

export default Spaces;