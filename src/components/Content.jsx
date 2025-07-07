// src/components/Content/Content.jsx
import React, { useState, useEffect } from 'react';
import './Content.css';
import { RefreshCw, Trash2, Copy, ExternalLink, Info, Rocket, Search, FileText, Globe, Youtube, CheckCircle, XCircle, Loader, Box } from 'lucide-react';

const Content = ({ onSaveToSpace }) => {
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
  const [showTranscript, setShowTranscript] = useState(false);
  const [copied, setCopied] = useState(false);

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
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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

  const getYouTubeVideoId = (url) => {
    // Extracts the video ID from a YouTube URL
    const regExp = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : '';
  };

  const handleShowTranscript = () => {
    setShowTranscript((prev) => !prev);
  };

  return (
    <div className="content-container compact-content-container">
      {/* Page Info Section */}
      {pageInfo.title && (
        <div className="page-info compact-page-info">
          <div className="compact-page-info-main">
            <div className="compact-page-info-icon">
              {pageInfo.type === 'youtube' ? <Youtube size={20} /> : <Globe size={20} />}
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
            {/* {pageInfo.url && (
              <button onClick={openSourceUrl} className="button button-white compact-source-link-btn">
                <ExternalLink size={16} />
                Source
              </button>
            )} */}
            <button
              onClick={onSaveToSpace}
              className="button button-white compact-action-btn"
            >
              <Box size={16} />
              Add to Space
            </button>
          </div>

          {content && !loading && (
            <div className="content-display compact-content-display">
              {pageInfo.type === 'youtube' && pageInfo.url ? (
                <div className="content-video compact-content-video">
                  {/* Embed YouTube video */}
                  <iframe
                    width="100%"
                    height="250"
                    src={`https://www.youtube.com/embed/${getYouTubeVideoId(pageInfo.url)}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    style={{ borderRadius: '12px', background: '#000' }}
                  ></iframe>
                </div>
              ) : (
                <div className="content-text compact-content-text">{content}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content Actions */}
      {content && (
        <div className="content-actions compact-content-actions">





          {content && (
            <button
              onClick={handleShowTranscript}
              className="button button-white compact-action-btn"
            >
              <FileText size={16} />
              {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
            </button>
          )}

          <button onClick={copyToClipboard} className="copy-btn button button-white compact-action-btn">
            <Copy size={16} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={refreshContent}
            className="button button-white compact-action-btn"
            disabled={loading}
          >
            <span>{loading ? <Loader size={16} className="spin" /> : <RefreshCw size={16} />}</span>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={clearStoredContent}
            className="button button-danger compact-action-btn"
          >
            <Trash2 size={16} />
            Clear
          </button>



        </div>
      )}

      {showTranscript && content && (
        <div
          style={{
            margin: '12px 0',
            padding: '14px',
            borderRadius: '8px',
            background: '#f8fafc',
            border: '1px solid #e0e7ef',
            minHeight: 400,
            overflowY: 'auto',
            fontSize: 13,
            color: '#334155',
            fontWeight: 500,
            whiteSpace: 'pre-wrap',
          }}
        >
          {content}
        </div>
      )}

      {/* Content Area */}
      {!hasStoredContent && (
        <div className="content-area compact-content-area">
          {loading && (
            <div className="loading-message compact-loading-message">
              <p><Loader size={20} className="spin" /> Loading your extracted content...</p>
            </div>
          )}

          {error && (
            <div className="error-message compact-error-message">
              <p><Info size={16} /> {error}</p>
              {!hasStoredContent && (
                <div className="instructions compact-instructions">
                  <h4><Rocket size={16} /> Getting Started with ExplainX</h4>
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
                    <Info size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> <strong>Pro Tip:</strong> The extraction works on most websites, articles, and YouTube videos. Perfect for research and learning!
                  </div>
                </div>
              )}
              <button onClick={refreshContent} className="button button-neutral compact-retry-btn">
                <Search size={16} />
                Check Again
              </button>
            </div>
          )}



        </div>
      )}

    </div>
  );
};

export default Content;