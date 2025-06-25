// src/components/Spaces/Spaces.jsx
import React, { useState, useEffect } from 'react';
import './Spaces.css';
import { DEV_MODE } from '../pages/Constants/';

const Spaces = ({ onSpaceSelect, currentContent }) => {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [savingToSpace, setSavingToSpace] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  // Configuration
  const API_BASE_URL = DEV_MODE
    ? 'http://localhost:3000/api'
    : 'https://learn.explainx.ai/api';

  useEffect(() => {
    checkAuthAndLoadSpaces();
  }, []);

  const checkAuthAndLoadSpaces = async () => {
    try {
      // Check if JWT token is stored
      const result = await chrome.storage.local.get(['access_token']);
      const storedToken = result.access_token;

      if (storedToken) {
        setAuthToken(storedToken);
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

  const saveToSpace = async (space) => {
    if (!currentContent || !currentContent.content) {
      alert('No content to save. Please extract content first.');
      return;
    }

    if (!authToken) {
      return;
    }

    try {
      setSavingToSpace(space.id);

      const contentData = {
        title: currentContent.title || 'Extracted Content',
        content: currentContent.content,
        type: currentContent.type || 'page',
        sourceUrl: currentContent.url,
        extractedAt: currentContent.timestamp || Date.now(),
      };

      const response = await fetch(
        `${API_BASE_URL}/spaces/${space.id}/content`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(contentData),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Save failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      alert(`Content saved to "${space.name}" successfully!`);
    } catch (err) {
      console.error('Error saving content:', err);
      alert(`Failed to save content: ${err.message}`);
    } finally {
      setSavingToSpace(null);
    }
  };
  return (
    <div className="spaces-container">
      <div className="spaces-header">
        <h3>My Spaces</h3>
        <button
          onClick={loadSpaces}
          className="refresh-spaces-btn"
          disabled={loading}
        >
          {loading ? '🔄' : '↻'}
        </button>
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
                        📚 {space._count.studyMaterials} materials
                      </span>
                    </div>
                  </div>

                  <div className="space-actions">
                    <button
                      onClick={() => saveToSpace(space)}
                      className="save-to-space-btn"
                      disabled={!currentContent || savingToSpace === space.id}
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
    </div>
  );
};

export default Spaces;
