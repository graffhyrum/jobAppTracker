# Job Application Tracker Browser Extension

A browser extension that enables quick capture of job posting information directly into your Job Application Tracker.

## Features

- **Auto-extract job data** from popular job boards (LinkedIn, Indeed, Greenhouse, Lever)
- **Manual review and editing** before saving
- **One-click submission** to your tracker
- **Generic fallback** for sites without specific extractors

## Installation

### Prerequisites

1. Job Application Tracker server running (default: `http://localhost:3000`)
2. API key configured (see Server Setup below)

### Chrome / Edge

1. Open Chrome/Edge and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension/` directory from this project
5. The extension icon should appear in your toolbar

### Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to the `extension/` directory
4. Select the `manifest.json` file
5. The extension will be loaded temporarily (until Firefox restarts)

**Note**: For permanent installation in Firefox, the extension needs to be signed. See [Firefox Extension Signing](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/) for details.

## Server Setup

### 1. Configure API Key

Add an API key to your `.env` file:

```bash
# Copy from example
cp .env.example .env

# Edit .env and set your API key
BROWSER_EXTENSION_API_KEY=your-secure-api-key-here
```

**Security Note**: Generate a strong random string for production use. You can use:
```bash
# Generate a random API key
openssl rand -hex 32
```

### 2. Start the Server

```bash
bun run dev
```

The server will start on `http://localhost:3000` by default.

## Extension Configuration

1. Click the extension icon in your toolbar
2. Click "Settings" at the bottom of the popup
3. Configure:
   - **Tracker API URL**: `http://localhost:3000` (or your server URL)
   - **API Key**: The key you set in your `.env` file
4. Click "Test Connection" to verify
5. Click "Save Settings"

## Usage

### Basic Workflow

1. **Navigate** to a job posting page
2. **Click** the extension icon in your toolbar
3. **Review** the auto-extracted information
4. **Edit** any fields as needed
5. **Click** "Save Application" to add to your tracker

### Manual Entry

If auto-extraction doesn't work well for a site:

1. Click the extension icon
2. Manually enter the job details
3. Click "Save Application"

### Supported Fields

- **Company** (required)
- **Position** (required)
- **Job Posting URL** (auto-filled with current page)
- **Status** (defaults to "applied")
- **Interest Rating** (1-3)
- **Job Description** (auto-extracted when possible)

## Supported Job Boards

The extension has specialized extractors for:

- **LinkedIn Jobs** - `linkedin.com/jobs`
- **Indeed** - `indeed.com`
- **Greenhouse** - `greenhouse.io`
- **Lever** - `lever.co`

For other sites, the extension uses a generic extractor that attempts to find job information using common HTML patterns and meta tags.

## Troubleshooting

### Extension not extracting data

1. Try clicking "Extract from Page" button in the popup
2. Check browser console for errors (F12 → Console tab)
3. Manually enter the data if extraction fails

### Connection errors

1. Verify server is running: `http://localhost:3000/api/health`
2. Check API key matches in both `.env` and extension settings
3. Look for CORS errors in browser console

### Data not saving

1. Check server logs for errors
2. Verify all required fields are filled
3. Test the API endpoint directly:
   ```bash
   curl -X POST http://localhost:3000/api/applications/from-extension \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your-api-key" \
     -d '{"company":"Test","position":"Developer"}'
   ```

## Development

### Project Structure

```
extension/
├── manifest.json          # Extension configuration
├── background/
│   └── service-worker.js  # Background tasks
├── content/
│   └── extractor.js       # Page data extraction logic
├── popup/
│   ├── popup.html         # Popup interface
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic
└── options/
    ├── options.html       # Settings page
    ├── options.css        # Settings styles
    └── options.js         # Settings logic
```

### Adding Support for New Job Boards

To add extraction support for a new job board:

1. Edit `extension/content/extractor.js`
2. Add a new extractor function:
   ```javascript
   function extractNewSiteJob() {
     const company = document.querySelector('.company-selector')?.textContent?.trim();
     const position = document.querySelector('.job-title')?.textContent?.trim();
     const description = document.querySelector('.job-description')?.textContent?.trim();

     if (company && position) {
       return { company, position, jobDescription: description };
     }
     return null;
   }
   ```
3. Register it in the `extractors` object:
   ```javascript
   const extractors = {
     'newsite.com': extractNewSiteJob,
     // ... existing extractors
   };
   ```

### Testing Changes

After making changes:

1. Reload the extension:
   - Chrome: Go to `chrome://extensions/` and click the reload icon
   - Firefox: Go to `about:debugging` and click "Reload"
2. Test on actual job posting pages
3. Check browser console for errors

## Privacy & Permissions

### Required Permissions

- **activeTab**: Access current tab to extract job posting data
- **storage**: Save your API settings locally

### Data Collection

- **No analytics or tracking**
- Data only sent to your configured tracker URL
- All data stays local except what you explicitly save

## License

Same license as the main Job Application Tracker project.

## Support

For issues or feature requests, please file an issue in the main repository.
