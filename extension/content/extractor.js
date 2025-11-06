/**
 * Content script for extracting job posting data from web pages
 * Runs on all pages and provides extraction functionality when triggered
 */

/**
 * Generic job data extractor that attempts to parse common job board patterns
 * @returns {Object} Extracted job data with company, position, url, and description
 */
function extractJobData() {
  const url = window.location.href;

  // Site-specific extractors
  const extractors = {
    'linkedin.com': extractLinkedInJob,
    'indeed.com': extractIndeedJob,
    'greenhouse.io': extractGreenhouseJob,
    'lever.co': extractLeverJob,
  };

  // Try site-specific extractor first
  for (const [domain, extractor] of Object.entries(extractors)) {
    if (url.includes(domain)) {
      const data = extractor();
      if (data) {
        return { ...data, jobPostingUrl: url };
      }
    }
  }

  // Fall back to generic extraction
  return extractGeneric();
}

/**
 * LinkedIn-specific job data extraction
 */
function extractLinkedInJob() {
  const company = document.querySelector('.job-details-jobs-unified-top-card__company-name')?.textContent?.trim()
    || document.querySelector('.topcard__org-name-link')?.textContent?.trim();

  const position = document.querySelector('.job-details-jobs-unified-top-card__job-title')?.textContent?.trim()
    || document.querySelector('.topcard__title')?.textContent?.trim();

  const description = document.querySelector('.jobs-description__content')?.textContent?.trim()
    || document.querySelector('.description__text')?.textContent?.trim();

  if (company && position) {
    return { company, position, jobDescription: description };
  }

  return null;
}

/**
 * Indeed-specific job data extraction
 */
function extractIndeedJob() {
  const company = document.querySelector('[data-company-name="true"]')?.textContent?.trim()
    || document.querySelector('.jobsearch-CompanyInfoContainer')?.textContent?.trim();

  const position = document.querySelector('[class*="jobsearch-JobInfoHeader-title"]')?.textContent?.trim()
    || document.querySelector('h1.jobsearch-JobInfoHeader-title')?.textContent?.trim();

  const description = document.querySelector('#jobDescriptionText')?.textContent?.trim();

  if (company && position) {
    return { company, position, jobDescription: description };
  }

  return null;
}

/**
 * Greenhouse-specific job data extraction
 */
function extractGreenhouseJob() {
  const company = document.querySelector('.company-name')?.textContent?.trim();

  const position = document.querySelector('.app-title')?.textContent?.trim()
    || document.querySelector('h1')?.textContent?.trim();

  const description = document.querySelector('#content')?.textContent?.trim()
    || document.querySelector('.job-post')?.textContent?.trim();

  if (company && position) {
    return { company, position, jobDescription: description };
  }

  return null;
}

/**
 * Lever-specific job data extraction
 */
function extractLeverJob() {
  const company = document.querySelector('.main-header-text-logo')?.textContent?.trim();

  const position = document.querySelector('.posting-headline h2')?.textContent?.trim();

  const description = document.querySelector('.posting-description')?.textContent?.trim()
    || document.querySelector('.section-wrapper')?.textContent?.trim();

  if (company && position) {
    return { company, position, jobDescription: description };
  }

  return null;
}

/**
 * Generic extraction using common HTML patterns and meta tags
 */
function extractGeneric() {
  const url = window.location.href;

  // Try to extract from meta tags
  const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
  const ogDescription = document.querySelector('meta[property="og:description"]')?.content;
  const pageTitle = document.title;

  // Try common selectors for job postings
  const position = document.querySelector('h1')?.textContent?.trim()
    || ogTitle
    || pageTitle;

  // Try to find company name in various common locations
  const company = document.querySelector('[class*="company"]')?.textContent?.trim()
    || document.querySelector('[class*="employer"]')?.textContent?.trim()
    || extractCompanyFromTitle(pageTitle);

  // Try to get description from main content areas
  const description = document.querySelector('article')?.textContent?.trim()
    || document.querySelector('[class*="description"]')?.textContent?.trim()
    || document.querySelector('[class*="job-details"]')?.textContent?.trim()
    || ogDescription;

  return {
    company: company || '',
    position: position || '',
    jobPostingUrl: url,
    jobDescription: description || ''
  };
}

/**
 * Attempt to extract company name from page title
 * Common patterns: "Job Title at Company Name" or "Company Name - Job Title"
 */
function extractCompanyFromTitle(title) {
  const atMatch = title.match(/at\s+(.+?)(?:\s*[-|]|$)/i);
  if (atMatch) return atMatch[1].trim();

  const dashMatch = title.match(/^([^-|]+)/);
  if (dashMatch) return dashMatch[1].trim();

  return null;
}

/**
 * Clean up extracted text by removing extra whitespace
 */
function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractJobData') {
    const data = extractJobData();
    sendResponse({ success: true, data });
  }
  return true; // Keep message channel open for async response
});
