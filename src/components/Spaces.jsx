// src/components/Spaces/Spaces.jsx
import React, { useState, useEffect } from 'react';
import './Spaces.css';
import { DEV_MODE } from '../pages/Constants/';

const Spaces = ({ onSpaceSelect, currentContent, onContentSaved }) => {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [savingToSpace, setSavingToSpace] = useState(null);
  const [savedToSpace, setSavedToSpace] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [toast, setToast] = useState(null);

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
          `Content extracted from ${
            currentContent.type === 'youtube' ? 'YouTube video' : 'web page'
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
      showToast('Study material saved successfully!', 'success');
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
          `✅ Connection successful!\nAuthenticated as: ${
            data.user.name || data.user.email
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
    <div className="spaces-container">
      <div className="spaces-header">
        <h3>My Spaces</h3>
        <div className="header-actions">
          <button
            onClick={async () => await loadSpaces(authToken)}
            className="refresh-spaces-btn"
            disabled={loading}
            title="Refresh spaces"
          >
            {loading ? '🔄' : '↻'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="spaces-loading">
          <p>Loading your spaces...</p>
        </div>
      )}

      {error && (
        <div className="spaces-error">
          <p>{error}</p>
          <button onClick={loadSpaces} className="retry-btn">
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {spaces.length === 0 ? (
            <div className="no-spaces">
              <p>No spaces found.</p>
              <p className="no-spaces-hint">
                Create your first space in the web app!
              </p>
            </div>
          ) : (
            <div className="spaces-list">
              {spaces.map((space) => (
                <div key={space.id} className="space-item">
                  <div className="space-info">
                    <h4 className="space-name">{space.name}</h4>
                    {space.description && (
                      <p className="space-description">{space.description}</p>
                    )}
                    <div className="space-meta">
                      <span className="space-visibility">
                        {space.isPublic ? '🌐 Public' : '🔒 Private'}
                      </span>
                      <span className="space-materials">
                        📚 {space._count?.studyMaterials || 0} materials
                      </span>
                    </div>
                  </div>

                  <div className="space-actions">
                    <button
                      onClick={() => saveToSpace(space)}
                      className={`save-to-space-btn ${
                        !currentContent || savingToSpace === space.id
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
                      {savingToSpace === space.id
                        ? '💾 Saving...'
                        : '💾 Save Here'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Enhanced status indicator */}
      {currentContent && (
        <div className="content-status">
          <div className="content-preview">
            <h5>📄 Ready to Save:</h5>
            <p className="content-title">
              {currentContent.title || 'Untitled Content'}
            </p>
            <p className="content-meta">
              {currentContent.type} •{' '}
              {(currentContent.content?.length || 0).toLocaleString()}{' '}
              characters
            </p>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <div className="toast-content">
            <span className="toast-icon">
              {toast.type === 'success' ? '✅' : '❌'}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Spaces;
