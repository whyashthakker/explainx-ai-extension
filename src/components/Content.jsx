// src/components/Content/Content.jsx
import React, { useState, useEffect } from 'react';
import './Content.css';

const Content = () => {
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

  useEffect(() => {
    fetchStoredContent();

    // Listen for storage changes to auto-update content
    const handleStorageChange = (changes, namespace) => {
      if (namespace === 'local' && changes.explainx_extracted_content) {
        fetchStoredContent();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

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
    <div className="content-container">
      {/* Page Info Section */}
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

      {/* Content Actions */}
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

      {/* Content Area */}
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
  );
};

export default Content;
