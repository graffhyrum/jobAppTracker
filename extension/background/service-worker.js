/**
 * Background service worker for Job Application Tracker extension
 * Handles background tasks and extension lifecycle events
 */

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Job Application Tracker extension installed');
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    console.log('Job Application Tracker extension updated');
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Future: Add any background processing logic here if needed
  return true;
});
