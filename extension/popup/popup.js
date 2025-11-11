/**
 * Popup script for Job Application Tracker extension
 * Handles form submission and communication with content script and API
 */

const form = document.getElementById("job-form");
const extractBtn = document.getElementById("extract-btn");
const submitBtn = document.getElementById("submit-btn");
const statusMessage = document.getElementById("status-message");

/**
 * Show status message to user
 */
function showStatus(message, type = "success") {
	statusMessage.textContent = message;
	statusMessage.className = `status-message ${type}`;

	if (type === "success") {
		setTimeout(() => {
			statusMessage.classList.add("hidden");
		}, 3000);
	}
}

/**
 * Get settings from chrome.storage
 */
async function getSettings() {
	return new Promise((resolve) => {
		chrome.storage.sync.get(
			{
				apiUrl: "http://localhost:3000",
				apiKey: "",
			},
			resolve,
		);
	});
}

/**
 * Extract job data from current page
 */
async function extractJobData() {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

	if (!tab?.id) {
		showStatus("Could not access current tab", "error");
		return;
	}

	try {
		const response = await chrome.tabs.sendMessage(tab.id, {
			action: "extractJobData",
		});

		if (response?.success && response?.data) {
			populateForm(response.data);
			showStatus("Data extracted successfully!", "success");
		} else {
			showStatus("Could not extract job data from this page", "error");
		}
	} catch (error) {
		console.error("Error extracting job data:", error);
		showStatus("Error extracting data. Try entering manually.", "error");
	}
}

/**
 * Populate form with extracted data
 */
function populateForm(data) {
	if (data.company) {
		document.getElementById("company").value = data.company;
	}
	if (data.position) {
		document.getElementById("position").value = data.position;
	}
	if (data.jobPostingUrl) {
		document.getElementById("jobPostingUrl").value = data.jobPostingUrl;
	}
	if (data.jobDescription) {
		document.getElementById("jobDescription").value = data.jobDescription;
	}
}

/**
 * Submit job application to API
 */
async function submitJobApplication(e) {
	e.preventDefault();

	const settings = await getSettings();

	if (!settings.apiKey) {
		showStatus("Please configure API key in settings", "error");
		return;
	}

	const formData = new FormData(form);
	const data = {
		company: formData.get("company"),
		position: formData.get("position"),
		status: formData.get("status") || "applied",
		applicationDate: new Date().toISOString(),
	};

	// Add optional fields if present
	if (formData.get("jobPostingUrl")) {
		data.jobPostingUrl = formData.get("jobPostingUrl");
	}
	if (formData.get("interestRating")) {
		data.interestRating = Number.parseInt(formData.get("interestRating"), 10);
	}
	if (formData.get("jobDescription")) {
		data.jobDescription = formData.get("jobDescription");
	}

	submitBtn.disabled = true;
	submitBtn.textContent = "Saving...";

	try {
		const response = await fetch(
			`${settings.apiUrl}/api/applications/from-extension`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-API-Key": settings.apiKey,
				},
				body: JSON.stringify(data),
			},
		);

		if (response.ok) {
			const result = await response.json();
			showStatus("Application saved successfully!", "success");
			console.log(result);
			form.reset();

			// Optional: Close popup after successful submission
			setTimeout(() => {
				window.close();
			}, 1500);
		} else {
			const error = await response.text();
			showStatus(`Error: ${error}`, "error");
		}
	} catch (error) {
		console.error("Error submitting application:", error);
		showStatus("Failed to connect to tracker. Check settings.", "error");
	} finally {
		submitBtn.disabled = false;
		submitBtn.textContent = "Save Application";
	}
}

// Event listeners
extractBtn.addEventListener("click", extractJobData);
form.addEventListener("submit", submitJobApplication);

// Auto-fill URL on popup open
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
	if (tab?.url && !tab.url.startsWith("chrome://")) {
		document.getElementById("jobPostingUrl").value = tab.url;
	}
});
