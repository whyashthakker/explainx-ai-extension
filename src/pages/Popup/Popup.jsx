import React, { useState, useEffect } from 'react';
import logo from '../../assets/img/icon-128.png';
import './Popup.css';

const Popup = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageInfo, setPageInfo] = useState({ title: '', url: '', type: '' });

  const fetchContent = async () => {
    setLoading(true);
    setError('');
    setContent('');

    try {
      // Send message to background script to get content
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'getPageContent' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      if (response) {
        setContent(response.content);
        setPageInfo({
          title: response.title,
          url: response.url,
          type: response.type
        });
      } else {
        setError('No response received from content script');
      }
    } catch (err) {
      setError('Error: ' + err.message);
      console.error('Error fetching content:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content).then(() => {
      alert('Content copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const refreshContent = () => {
    fetchContent();
  };

  return (
    <div className="popup-container">
      <header className="popup-header">
        <img src={logo} className="popup-logo" alt="ExplainX Logo" />
        <h1 className="popup-title">ExplainX</h1>
      </header>
      
      <div className="popup-content">
        {pageInfo.title && (
          <div className="page-info">
            <h3 className="page-title">{pageInfo.title}</h3>
            <p className="page-type">
              {pageInfo.type === 'youtube' ? '📹 YouTube Video' : '📄 Web Page'}
            </p>
          </div>
        )}

        <div className="content-actions">
          <button onClick={refreshContent} className="action-btn refresh-btn" disabled={loading}>
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
          {content && (
            <button onClick={copyToClipboard} className="action-btn copy-btn">
              📋 Copy
            </button>
          )}
        </div>

        <div className="content-area">
          {loading && (
            <div className="loading-message">
              <p>Fetching content...</p>
              {pageInfo.type === 'youtube' && (
                <p className="loading-note">This may take a few seconds for YouTube transcripts</p>
              )}
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <p>❌ {error}</p>
              <button onClick={refreshContent} className="retry-btn">
                Try Again
              </button>
            </div>
          )}
          
          {content && !loading && (
            <div className="content-display">
              <div className="content-text">
                {content}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Popup;
