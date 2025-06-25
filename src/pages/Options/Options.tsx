import React, { useState, useEffect } from 'react';
import './Options.css';

interface Props {
  title: string;
}

interface Settings {
  autoExtract: boolean;
  showNotifications: boolean;
  defaultSpaceId: string;
  apiUrl: string;
}

const Options: React.FC<Props> = ({ title }: Props) => {
  const [settings, setSettings] = useState<Settings>({
    autoExtract: false,
    showNotifications: true,
    defaultSpaceId: '',
    apiUrl: 'https://learn.explainx.ai/api',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const result = await chrome.storage.sync.get(['extension_settings']);
      if (result.extension_settings) {
        setSettings({ ...settings, ...result.extension_settings });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await chrome.storage.sync.set({ extension_settings: settings });
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key: keyof Settings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllData = async () => {
    if (
      confirm(
        'Are you sure you want to clear all extension data? This action cannot be undone.'
      )
    ) {
      try {
        await chrome.storage.local.clear();
        await chrome.storage.sync.clear();
        setMessage('All data cleared successfully!');
        // Reset settings to defaults
        setSettings({
          autoExtract: false,
          showNotifications: true,
          defaultSpaceId: '',
          apiUrl: 'https://learn.explainx.ai/api',
        });
      } catch (error) {
        console.error('Error clearing data:', error);
        setMessage('Error clearing data');
      }
    }
  };

  if (loading) {
    return (
      <div className="OptionsContainer">
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="OptionsContainer">
      <div className="options-header">
        <h1>ExplainX Extension Settings</h1>
        <p>Configure your extension preferences below</p>
      </div>

      <div className="options-content">
        <div className="settings-section">
          <h2>General Settings</h2>

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.autoExtract}
                onChange={(e) =>
                  handleSettingChange('autoExtract', e.target.checked)
                }
              />
              <span className="checkmark"></span>
              Auto-extract content when visiting supported pages
            </label>
            <p className="setting-description">
              Automatically extract content from YouTube videos and web pages
              when you visit them
            </p>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.showNotifications}
                onChange={(e) =>
                  handleSettingChange('showNotifications', e.target.checked)
                }
              />
              <span className="checkmark"></span>
              Show notifications
            </label>
            <p className="setting-description">
              Display notifications when content is extracted or saved
            </p>
          </div>

          <div className="setting-item">
            <label className="setting-label-text">API Base URL</label>
            <input
              type="text"
              className="setting-input"
              value={settings.apiUrl}
              onChange={(e) => handleSettingChange('apiUrl', e.target.value)}
              placeholder="https://learn.explainx.ai/api"
            />
            <p className="setting-description">
              The base URL for the ExplainX API (for advanced users)
            </p>
          </div>
        </div>

        <div className="settings-section">
          <h2>Data Management</h2>

          <div className="setting-item">
            <button onClick={clearAllData} className="danger-button">
              Clear All Extension Data
            </button>
            <p className="setting-description">
              Remove all stored content, settings, and authentication data
            </p>
          </div>
        </div>

        <div className="options-footer">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="save-button"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          {message && (
            <div
              className={`message ${
                message.includes('Error') ? 'error' : 'success'
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Options;
