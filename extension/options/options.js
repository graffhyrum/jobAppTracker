/**
 * Options page script for Job Application Tracker extension
 * Handles settings persistence and connection testing
 */

const form = document.getElementById('settings-form');
const statusMessage = document.getElementById('status-message');
const testConnectionBtn = document.getElementById('test-connection');
const apiUrlInput = document.getElementById('apiUrl');
const apiKeyInput = document.getElementById('apiKey');

/**
 * Show status message
 */
function showStatus(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message show ${type}`;

  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 4000);
}

/**
 * Load saved settings
 */
function loadSettings() {
  chrome.storage.sync.get({
    apiUrl: 'http://localhost:3000',
    apiKey: ''
  }, (settings) => {
    apiUrlInput.value = settings.apiUrl;
    apiKeyInput.value = settings.apiKey;
  });
}

/**
 * Save settings
 */
function saveSettings(e) {
  e.preventDefault();

  const settings = {
    apiUrl: apiUrlInput.value.trim(),
    apiKey: apiKeyInput.value.trim()
  };

  // Remove trailing slash from URL if present
  if (settings.apiUrl.endsWith('/')) {
    settings.apiUrl = settings.apiUrl.slice(0, -1);
  }

  chrome.storage.sync.set(settings, () => {
    showStatus('Settings saved successfully!', 'success');
  });
}

/**
 * Test connection to API
 */
async function testConnection() {
  const apiUrl = apiUrlInput.value.trim();
  const apiKey = apiKeyInput.value.trim();

  if (!apiUrl || !apiKey) {
    showStatus('Please enter both API URL and API key', 'error');
    return;
  }

  testConnectionBtn.disabled = true;
  testConnectionBtn.textContent = 'Testing...';
  showStatus('Testing connection...', 'info');

  try {
    const response = await fetch(`${apiUrl}/api/health`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey
      }
    });

    if (response.ok) {
      showStatus('Connection successful! Your tracker is reachable.', 'success');
    } else if (response.status === 401 || response.status === 403) {
      showStatus('Connection failed: Invalid API key', 'error');
    } else {
      showStatus(`Connection failed: Server returned ${response.status}`, 'error');
    }
  } catch (error) {
    console.error('Connection test error:', error);
    showStatus(
      'Connection failed: Could not reach tracker. Is it running?',
      'error'
    );
  } finally {
    testConnectionBtn.disabled = false;
    testConnectionBtn.textContent = 'Test Connection';
  }
}

// Event listeners
form.addEventListener('submit', saveSettings);
testConnectionBtn.addEventListener('click', testConnection);

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);
