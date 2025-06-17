<img src="src/assets/img/icon-128.png" width="64"/>

# ExplainX - YouTube Transcript & Page Content Viewer

A Chrome extension that helps you quickly extract and view YouTube video transcripts and web page content in a convenient popup interface.

## Features

- **YouTube Transcript Extraction**: Automatically extracts transcripts from YouTube videos
- **Page Content Extraction**: Extracts readable text content from any webpage
- **Clean UI**: Modern, responsive popup interface
- **Copy to Clipboard**: Easily copy extracted content
- **Refresh Content**: Update content without reloading the page
- **Auto-Detection**: Automatically detects whether you're on YouTube or another site

## Installation

### From Source

1. Check if your [Node.js](https://nodejs.org/) version is >= **18**.
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/explainx-extension.git
   cd explainx-extension
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the extension:
   ```bash
   npm run build
   ```
5. Load the extension in Chrome:
   1. Open `chrome://extensions/`
   2. Enable `Developer mode`
   3. Click `Load unpacked extension`
   4. Select the `build` folder

### Development

To develop the extension with hot reloading:

```bash
npm start
```

This will start the webpack dev server. You can specify a different port:

```bash
PORT=6002 npm start
```

## How It Works

### On YouTube
- Click the extension icon while watching a YouTube video
- The extension will attempt to extract the video transcript
- If available, the transcript will be displayed in the popup
- Multiple methods are used to ensure maximum compatibility

### On Other Websites
- Click the extension icon on any webpage
- The extension will extract the main readable content
- Content is cleaned and formatted for easy reading
- Long content is truncated to 5000 characters for performance

## Usage

1. Navigate to any webpage or YouTube video
2. Click the ExplainX extension icon in your browser toolbar
3. Wait for the content to load (YouTube transcripts may take a few seconds)
4. Use the "Copy" button to copy content to your clipboard
5. Use the "Refresh" button to reload content if needed

## Technical Details

- Built with React 18 and Webpack 5
- Uses Chrome Extension Manifest V3
- Content scripts handle page content extraction
- Background script manages communication between popup and content scripts
- Supports both YouTube caption tracks and transcript panels

## Permissions

The extension requires the following permissions:
- `activeTab`: To access the current tab's content
- `scripting`: To inject content scripts
- `storage`: To store user preferences
- `*://*.youtube.com/*`: To access YouTube content
- `*://*/*`: To access content from all websites

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

If you encounter any issues or have feature requests, please create an issue on GitHub.

---

Built with ❤️ using the Chrome Extension React Webpack Boilerplate
