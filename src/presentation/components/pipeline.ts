import type { JobApplication } from "../../domain/entities/job-application";
import type { PipelineConfig } from "../../domain/entities/pipeline-config";

const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString();
};

const formatInterestRating = (rating?: number) => {
	if (!rating) return "";
	return "★".repeat(rating) + "☆".repeat(3 - rating);
};

const getStatusCategory = (
	status: string,
	pipelineConfig: PipelineConfig,
): "active" | "inactive" => {
	// Defensive checks for undefined/null config
	if (
		!pipelineConfig ||
		!pipelineConfig.active ||
		!Array.isArray(pipelineConfig.active)
	) {
		return "inactive";
	}

	// Defensive check for empty status
	if (!status || status.trim() === "") {
		return "inactive";
	}

	return pipelineConfig.active.includes(status) ? "active" : "inactive";
};

export const pipelineComponent = (
	pipelineConfig: PipelineConfig,
	applications: JobApplication[] = [],
	options: {
		enableClientSidePagination?: boolean;
		initialPageSize?: number;
		maxSerializedRecords?: number;
	} = {},
): string => {
	const {
		enableClientSidePagination = true,
		initialPageSize = 25,
		maxSerializedRecords = 1000,
	} = options;

	// Default sort by last updated date (most recent first)
	const sortedApplications = [...applications].sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	);

	const renderTableRow = (app: JobApplication) => {
		const currentStatus = app.getCurrentStatus();
		const statusText = currentStatus?.current || "No Status";
		const statusCategory = currentStatus
			? getStatusCategory(currentStatus.current, pipelineConfig)
			: "inactive";
		const isOverdue = app.isOverdue();

		return `
			<tr class="application-row ${statusCategory} ${isOverdue ? "overdue" : ""}">
				<td class="company-cell">${app.company}</td>
				<td class="position-cell">${app.positionTitle}</td>
				<td class="status-cell">
					<span class="status-badge ${statusCategory}">${statusText}</span>
				</td>
				<td class="application-date-cell">${formatDate(app.applicationDate)}</td>
				<td class="updated-date-cell">${formatDate(app.updatedAt)}</td>
				<td class="interest-cell">${formatInterestRating(app.interestRating)}</td>
				<td class="next-event-cell">
					${
						app.nextEventDate
							? `<span class="${isOverdue ? "overdue-date" : ""}">${formatDate(app.nextEventDate)}</span>`
							: ""
					}
				</td>
				<td class="actions-cell">
					<button class="action-btn edit" title="Edit">✏️</button>
					<button class="action-btn view" title="View Details">👁️</button>
				</td>
			</tr>
		`;
	};

	return `
		<div id="pipeline-container" class="pipeline-container">
			<div class="pipeline-header">
				<h2>Job Applications</h2>
				<div class="summary-stats">
					<span class="stat active">Active: ${
						applications.filter((app) => {
							const status = app.getCurrentStatus();
							return (
								status &&
								getStatusCategory(status.current, pipelineConfig) === "active"
							);
						}).length
					}</span>
					<span class="stat inactive">Inactive: ${
						applications.filter((app) => {
							const status = app.getCurrentStatus();
							return (
								!status ||
								getStatusCategory(status.current, pipelineConfig) === "inactive"
							);
						}).length
					}</span>
					<span class="stat total">Total: ${applications.length}</span>
				</div>
			</div>

			<div class="table-controls">
				<div class="filters">
					<label for="search-filter" class="sr-only">Search applications</label>
					<input 
						type="text" 
						id="search-filter" 
						placeholder="Search company or position..." 
						class="search-input"
						aria-label="Search company or position"
					>
					<label for="status-filter" class="sr-only">Filter by status</label>
					<select id="status-filter" class="filter-select" aria-label="Filter by status">
						<option value="">All Statuses</option>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
						${pipelineConfig.active
							.map((status) => `<option value="${status}">${status}</option>`)
							.join("")}
						${pipelineConfig.inactive
							.map((status) => `<option value="${status}">${status}</option>`)
							.join("")}
					</select>
					<label for="interest-filter" class="sr-only">Filter by interest level</label>
					<select id="interest-filter" class="filter-select" aria-label="Filter by interest level">
						<option value="">All Interest Levels</option>
						<option value="3">High Interest (★★★)</option>
						<option value="2">Medium Interest (★★☆)</option>
						<option value="1">Low Interest (★☆☆)</option>
					</select>
					<label for="overdue-filter" class="sr-only">Filter by overdue status</label>
					<select id="overdue-filter" class="filter-select" aria-label="Filter by overdue status">
						<option value="">All Applications</option>
						<option value="overdue">Overdue Only</option>
						<option value="upcoming">Upcoming Events</option>
					</select>
				</div>
				<div class="pagination-controls">
					<label for="page-size" class="sr-only">Items per page</label>
					<select id="page-size" class="page-size-select" aria-label="Items per page">
						<option value="10"${initialPageSize === 10 ? " selected" : ""}>10 per page</option>
						<option value="25"${initialPageSize === 25 ? " selected" : ""}>25 per page</option>
						<option value="50"${initialPageSize === 50 ? " selected" : ""}>50 per page</option>
						<option value="100"${initialPageSize === 100 ? " selected" : ""}>100 per page</option>
					</select>
				</div>
			</div>
			
			<div class="table-container">
				<table class="applications-table" id="applications-table" role="table" aria-label="Job applications">
					<thead>
						<tr role="row">
							<th class="sortable" data-column="company">
								Company <span class="sort-indicator">↕️</span>
							</th>
							<th class="sortable" data-column="position">
								Position <span class="sort-indicator">↕️</span>
							</th>
							<th class="sortable" data-column="status">
								Status <span class="sort-indicator">↕️</span>
							</th>
							<th class="sortable" data-column="applicationDate">
								Applied <span class="sort-indicator">↕️</span>
							</th>
							<th class="sortable" data-column="updatedAt">
								Last Updated <span class="sort-indicator">🔽</span>
							</th>
							<th class="sortable" data-column="interest">
								Interest <span class="sort-indicator">↕️</span>
							</th>
							<th class="sortable" data-column="nextEventDate">
								Next Event <span class="sort-indicator">↕️</span>
							</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody id="applications-tbody">
						${
							sortedApplications.length > 0
								? sortedApplications.map(renderTableRow).join("")
								: `<tr><td colspan="8" class="empty-state">No applications found</td></tr>`
						}
					</tbody>
				</table>
				
				<div class="pagination-info" id="pagination-info">
					Showing ${Math.min(sortedApplications.length, initialPageSize)} of ${applications.length} applications${applications.length > maxSerializedRecords ? ` (${maxSerializedRecords} loaded for client-side filtering)` : ""}
				</div>
				
				<div class="pagination-nav" id="pagination-nav" role="navigation" aria-label="Table pagination">
					<button 
						class="pagination-btn" 
						id="prev-page" 
						disabled 
						aria-label="Go to previous page"
						aria-disabled="true"
					>← Previous</button>
					<span class="page-numbers" id="page-numbers" aria-live="polite" aria-label="Current page">1</span>
					<button 
						class="pagination-btn" 
						id="next-page" 
						${sortedApplications.length <= initialPageSize ? 'disabled aria-disabled="true"' : 'aria-disabled="false"'}
						aria-label="Go to next page"
					>Next →</button>
				</div>
			</div>
		</div>

		<link rel="stylesheet" href="/styles/pipeline.css">

		<script>
			// Optimize data serialization for large datasets
			const shouldUseClientSidePagination = ${enableClientSidePagination};
			const totalApplications = ${applications.length};
			
			// Only serialize limited data for client-side operations
			const applicationData = ${JSON.stringify(
				sortedApplications
					.slice(
						0,
						enableClientSidePagination ? maxSerializedRecords : initialPageSize,
					)
					.map((app) => {
						const currentStatus = app.getCurrentStatus();
						const statusCategory = currentStatus
							? getStatusCategory(currentStatus.current, pipelineConfig)
							: "inactive";

						return {
							id: app.id,
							company: app.company,
							positionTitle: app.positionTitle,
							applicationDate: app.applicationDate,
							updatedAt: app.updatedAt,
							interestRating: app.interestRating || 0,
							nextEventDate: app.nextEventDate || null,
							status: currentStatus?.current || "No Status",
							statusCategory,
							isOverdue: app.isOverdue(),
						};
					}),
			)};

			// Minimal config serialization
			const pipelineConfig = ${JSON.stringify({
				active: pipelineConfig.active,
				inactive: pipelineConfig.inactive,
			})};
			
			// Performance warning for large datasets
			${
				applications.length > maxSerializedRecords
					? `
			console.warn('Large dataset detected (${applications.length} records). Consider implementing server-side pagination for better performance.');
			`
					: ""
			}

			// State management
			let currentSort = { column: 'updatedAt', direction: 'desc' };
			let currentPage = 1;
			let pageSize = ${initialPageSize};
			let filteredData = [...applicationData];
			let searchDebounceTimer = null;

			// Utility functions
			function formatDate(dateString) {
				return new Date(dateString).toLocaleDateString();
			}

			function formatInterestRating(rating) {
				if (!rating) return "";
				return "★".repeat(rating) + "☆".repeat(3 - rating);
			}

			function sortData(data, column, direction) {
				return [...data].sort((a, b) => {
					let aVal = a[column];
					let bVal = b[column];

					// Handle dates
					if (column === 'applicationDate' || column === 'updatedAt' || column === 'nextEventDate') {
						aVal = aVal ? new Date(aVal).getTime() : 0;
						bVal = bVal ? new Date(bVal).getTime() : 0;
					}
					
					// Handle interest rating
					if (column === 'interest') {
						aVal = a.interestRating || 0;
						bVal = b.interestRating || 0;
					}

					// Handle strings
					if (typeof aVal === 'string') {
						aVal = aVal.toLowerCase();
						bVal = bVal.toLowerCase();
					}

					if (direction === 'asc') {
						return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
					} else {
						return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
					}
				});
			}

			function filterData(immediate = true) {
				const searchTerm = document.getElementById('search-filter').value.toLowerCase();
				const statusFilter = document.getElementById('status-filter').value;
				const interestFilter = document.getElementById('interest-filter').value;
				const overdueFilter = document.getElementById('overdue-filter').value;

				// Use early returns and optimized filtering
				filteredData = applicationData.filter(app => {
					// Search filter - most expensive, do last if other filters exist
					const hasOtherFilters = statusFilter || interestFilter || overdueFilter;
					
					// Status filter - cheapest, do first
					if (statusFilter) {
						if (statusFilter === 'active' || statusFilter === 'inactive') {
							if (app.statusCategory !== statusFilter) return false;
						} else {
							if (app.status !== statusFilter) return false;
						}
					}

					// Interest filter - cheap numeric comparison
					if (interestFilter && app.interestRating != interestFilter) {
						return false;
					}

					// Overdue filter - boolean check
					if (overdueFilter === 'overdue' && !app.isOverdue) return false;
					if (overdueFilter === 'upcoming' && (!app.nextEventDate || app.isOverdue)) return false;

					// Search filter last - most expensive
					if (searchTerm && !app.company.toLowerCase().includes(searchTerm) && 
						!app.positionTitle.toLowerCase().includes(searchTerm)) {
						return false;
					}

					return true;
				});

				// Reset to page 1 when filtering changes
				if (currentPage !== 1) {
					currentPage = 1;
				}
				
				if (immediate) {
					updateDisplay();
				}
			}

			// Debounced version for search input
			function debouncedFilterData() {
				if (searchDebounceTimer) {
					clearTimeout(searchDebounceTimer);
				}
				searchDebounceTimer = setTimeout(() => {
					filterData(true);
					searchDebounceTimer = null;
				}, 300); // 300ms debounce
			}

			function updateDisplay() {
				const sortedData = sortData(filteredData, currentSort.column, currentSort.direction);
				const startIndex = (currentPage - 1) * pageSize;
				const endIndex = startIndex + pageSize;
				const pageData = sortedData.slice(startIndex, endIndex);

				// Update table body
				const tbody = document.getElementById('applications-tbody');
				if (pageData.length === 0) {
					tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No applications found</td></tr>';
				} else {
					tbody.innerHTML = pageData.map(app => {
						return \`
							<tr class="application-row \${app.statusCategory} \${app.isOverdue ? 'overdue' : ''}">
								<td class="company-cell">\${app.company}</td>
								<td class="position-cell">\${app.positionTitle}</td>
								<td class="status-cell">
									<span class="status-badge \${app.statusCategory}">\${app.status}</span>
								</td>
								<td class="application-date-cell">\${formatDate(app.applicationDate)}</td>
								<td class="updated-date-cell">\${formatDate(app.updatedAt)}</td>
								<td class="interest-cell">\${formatInterestRating(app.interestRating)}</td>
								<td class="next-event-cell">
									\${app.nextEventDate 
										? \`<span class="\${app.isOverdue ? 'overdue-date' : ''}">\${formatDate(app.nextEventDate)}</span>\`
										: ""
									}
								</td>
								<td class="actions-cell">
									<button class="action-btn edit" title="Edit">✏️</button>
									<button class="action-btn view" title="View Details">👁️</button>
								</td>
							</tr>
						\`;
					}).join('');
				}

				// Update pagination info
				const totalPages = Math.ceil(filteredData.length / pageSize);
				document.getElementById('pagination-info').textContent = 
					\`Showing \${startIndex + 1}-\${Math.min(endIndex, filteredData.length)} of \${filteredData.length} applications\`;

				// Update pagination navigation with accessibility
				const prevBtn = document.getElementById('prev-page');
				const nextBtn = document.getElementById('next-page');
				const pageNumbers = document.getElementById('page-numbers');

				prevBtn.disabled = currentPage <= 1;
				prevBtn.setAttribute('aria-disabled', currentPage <= 1 ? 'true' : 'false');
				
				nextBtn.disabled = currentPage >= totalPages;
				nextBtn.setAttribute('aria-disabled', currentPage >= totalPages ? 'true' : 'false');
				
				pageNumbers.textContent = \`\${currentPage} of \${totalPages || 1}\`;

				// Update sort indicators
				document.querySelectorAll('.sortable').forEach(th => {
					th.classList.remove('sort-asc', 'sort-desc');
					if (th.dataset.column === currentSort.column) {
						th.classList.add(\`sort-\${currentSort.direction}\`);
					}
				});
			}

			// Event listeners
			document.addEventListener('DOMContentLoaded', function() {
				// Search and filter events
				document.getElementById('search-filter').addEventListener('input', debouncedFilterData);
				document.getElementById('status-filter').addEventListener('change', filterData);
				document.getElementById('interest-filter').addEventListener('change', filterData);
				document.getElementById('overdue-filter').addEventListener('change', filterData);

				// Page size change
				document.getElementById('page-size').addEventListener('change', function() {
					pageSize = parseInt(this.value);
					currentPage = 1;
					updateDisplay();
				});

				// Pagination navigation
				document.getElementById('prev-page').addEventListener('click', function() {
					if (currentPage > 1) {
						currentPage--;
						updateDisplay();
					}
				});

				document.getElementById('next-page').addEventListener('click', function() {
					const totalPages = Math.ceil(filteredData.length / pageSize);
					if (currentPage < totalPages) {
						currentPage++;
						updateDisplay();
					}
				});

				// Column sorting
				document.querySelectorAll('.sortable').forEach(th => {
					th.addEventListener('click', function() {
						const column = this.dataset.column;
						if (currentSort.column === column) {
							currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
						} else {
							currentSort.column = column;
							currentSort.direction = 'asc';
						}
						updateDisplay();
					});
				});

				// Initial display update
				updateDisplay();
			});
		</script>
	`;
};
