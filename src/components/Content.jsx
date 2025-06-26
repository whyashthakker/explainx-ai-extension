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
        // Create a subtle success feedback
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.textContent;
        btn.textContent = '✅ Copied!';
        btn.style.background = '#10b981'; // Green for success

        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '#8b5cf6'; // Back to purple
        }, 2000);
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy content. Please try again.');
      });
  };

  const refreshContent = () => {
    fetchStoredContent();
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openSourceUrl = () => {
    if (pageInfo.url) {
      chrome.tabs.create({ url: pageInfo.url });
    }
  };

  const getPageTypeDisplay = (type) => {
    switch (type) {
      case 'youtube':
        return (
          <>
            <span className="page-type-icon">🎥</span>
            YouTube Video
          </>
        );
      default:
        return (
          <>
            <span className="page-type-icon">🌐</span>
            Web Page
          </>
        );
    }
  };

  return (
    <div className="content-container compact-content-container">
      {/* Page Info Section */}
      {pageInfo.title && (
        <div className="page-info compact-page-info">
          <div className="compact-page-info-main">
            <div className="compact-page-info-icon">
              {pageInfo.type === 'youtube' ? '🎥' : '🌐'}
            </div>
            <div className="compact-page-info-details">
              <h3 className="page-title compact-page-title" title={pageInfo.title}>
                {pageInfo.title}
              </h3>
              {pageInfo.timestamp && (
                <span className="page-timestamp compact-page-timestamp">
                  {formatTimestamp(pageInfo.timestamp)}
                </span>
              )}
            </div>
            {pageInfo.url && (
              <button onClick={openSourceUrl} className="button button-white compact-source-link-btn">
                <span>🔗</span>
                Source
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content Actions */}
      <div className="content-actions compact-content-actions">
        <button
          onClick={refreshContent}
          className="button button-neutral compact-action-btn"
          disabled={loading}
        >
          <span>{loading ? '⟳' : '🔄'}</span>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        {content && (
          <>
            <button onClick={copyToClipboard} className="button button-white compact-action-btn">
              <span>📋</span>
              Copy
            </button>
            <button
              onClick={clearStoredContent}
              className="button button-danger compact-action-btn"
            >
              <span>🗑️</span>
              Clear
            </button>
          </>
        )}
      </div>

      {/* Content Area */}
      <div className="content-area compact-content-area">
        {loading && (
          <div className="loading-message compact-loading-message">
            <p>✨ Loading your extracted content...</p>
          </div>
        )}

        {error && (
          <div className="error-message compact-error-message">
            <p>ℹ️ {error}</p>
            {!hasStoredContent && (
              <div className="instructions compact-instructions">
                <h4>🚀 Getting Started with ExplainX</h4>
                <ol>
                  <li>
                    <strong>Navigate</strong> to any webpage or YouTube video you want to analyze
                  </li>
                  <li>
                    <strong>Look for</strong> the floating purple "Extract" button on the page
                  </li>
                  <li>
                    <strong>Click</strong> the button to extract and process the content
                  </li>
                  <li>
                    <strong>Return here</strong> to view, copy, or analyze your extracted content
                  </li>
                </ol>
                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.07) 0%, rgba(147, 51, 234, 0.07) 100%)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#475569',
                  fontWeight: '500'
                }}>
                  💡 <strong>Pro Tip:</strong> The extraction works on most websites, articles, and YouTube videos. Perfect for research and learning!
                </div>
              </div>
            )}
            <button onClick={refreshContent} className="button button-neutral compact-retry-btn">
              <span>🔍</span>
              Check Again
            </button>
          </div>
        )}

        {content && !loading && (
          <div className="content-display compact-content-display">
            <div className="content-text compact-content-text">{content}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Content;