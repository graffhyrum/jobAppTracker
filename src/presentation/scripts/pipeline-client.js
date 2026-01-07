// src/presentation/scripts/pipeline-client.ts
var formatDate = (dateString) => {
  return new Date(dateString).toISOString();
};
var formatInterestRating = (rating) => {
  if (!rating)
    return "";
  return "★".repeat(rating) + "☆".repeat(3 - rating);
};
var sortData = (data, column, direction) => {
  return [...data].sort((a, b) => {
    let aVal = a[column];
    let bVal = b[column];
    if (column === "applicationDate" || column === "updatedAt" || column === "nextEventDate") {
      aVal = aVal && typeof aVal === "string" ? new Date(aVal).getTime() : 0;
      bVal = bVal && typeof bVal === "string" ? new Date(bVal).getTime() : 0;
    }
    if (column === "interestRating") {
      aVal = a.interestRating || 0;
      bVal = b.interestRating || 0;
    }
    if (typeof aVal === "string" && typeof bVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    const aNum = typeof aVal === "number" ? aVal : 0;
    const bNum = typeof bVal === "number" ? bVal : 0;
    if (typeof aVal === "string" && typeof bVal === "string") {
      if (direction === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    }
    if (direction === "asc") {
      return aNum < bNum ? -1 : aNum > bNum ? 1 : 0;
    } else {
      return aNum > bNum ? -1 : aNum < bNum ? 1 : 0;
    }
  });
};
var filterData = (applicationData, state, immediate = true) => {
  const searchInput = document.getElementById("search-filter");
  const statusSelect = document.getElementById("status-filter");
  const interestSelect = document.getElementById("interest-filter");
  const overdueSelect = document.getElementById("overdue-filter");
  const searchTerm = searchInput?.value?.toLowerCase() || "";
  const statusFilter = statusSelect?.value || "";
  const interestFilter = interestSelect?.value || "";
  const overdueFilter = overdueSelect?.value || "";
  state.filteredData = applicationData.filter((app) => {
    if (statusFilter) {
      if (statusFilter === "active" || statusFilter === "inactive") {
        if (app.statusCategory !== statusFilter)
          return false;
      } else {
        if (app.status !== statusFilter)
          return false;
      }
    }
    if (interestFilter && app.interestRating !== parseInt(interestFilter, 10)) {
      return false;
    }
    if (overdueFilter === "overdue" && !app.isOverdue)
      return false;
    if (overdueFilter === "upcoming" && (!app.nextEventDate || app.isOverdue))
      return false;
    if (searchTerm && !app.company.toLowerCase().includes(searchTerm) && !app.positionTitle.toLowerCase().includes(searchTerm)) {
      return false;
    }
    return true;
  });
  if (state.currentPage !== 1) {
    state.currentPage = 1;
  }
  if (immediate) {
    updateDisplay(state);
  }
};
var updateDisplay = (state) => {
  const sortedData = sortData(state.filteredData, state.currentSort.column, state.currentSort.direction);
  const startIndex = (state.currentPage - 1) * state.pageSize;
  const endIndex = startIndex + state.pageSize;
  const pageData = sortedData.slice(startIndex, endIndex);
  const tbody = document.getElementById("applications-tbody");
  if (!tbody)
    return;
  if (pageData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No applications found</td></tr>';
  } else {
    tbody.innerHTML = pageData.map((app) => `
			<tr class="application-row ${app.statusCategory} ${app.isOverdue ? "overdue" : ""}" data-testid="application-row-${app.id}">
				<td class="company-cell" data-testid="company-cell-${app.id}">${app.company}</td>
				<td class="position-cell" data-testid="position-cell-${app.id}">${app.positionTitle}</td>
				<td class="status-cell" data-testid="status-cell-${app.id}">
					<span class="status-badge ${app.statusCategory}" data-testid="status-badge-${app.id}">${app.status}</span>
				</td>
				<td class="application-date-cell" data-testid="application-date-cell-${app.id}">${formatDate(app.applicationDate)}</td>
				<td class="updated-date-cell" data-testid="updated-date-cell-${app.id}">${formatDate(app.updatedAt)}</td>
				<td class="interest-cell" data-testid="interest-cell-${app.id}">${formatInterestRating(app.interestRating)}</td>
				<td class="next-event-cell" data-testid="next-event-cell-${app.id}">
					${app.nextEventDate ? `<span class="${app.isOverdue ? "overdue-date" : ""}" data-testid="next-event-date-${app.id}">${formatDate(app.nextEventDate)}</span>` : `<span class="no-date" data-testid="no-next-event-${app.id}">No date set</span>`}
				</td>
				<td class="actions-cell" data-testid="actions-cell-${app.id}">
					<button
						class="action-btn edit"
						data-testid="edit-btn-${app.id}"
						hx-get="/applications/${app.id}/edit"
						hx-target="closest tr"
						hx-swap="outerHTML"
						title="Edit Application">✏️</button>
					<button class="action-btn view" data-testid="view-btn-${app.id}" title="View Details">\uD83D\uDC41️</button>
				</td>
			</tr>
		`).join("");
    if (typeof window.htmx !== "undefined" && window.htmx) {
      window.htmx.process(tbody);
    }
  }
  const totalPages = Math.ceil(state.filteredData.length / state.pageSize);
  const paginationInfo = document.getElementById("pagination-info");
  if (paginationInfo) {
    paginationInfo.textContent = `Showing ${startIndex + 1}-${Math.min(endIndex, state.filteredData.length)} of ${state.filteredData.length} applications`;
  }
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");
  const pageNumbers = document.getElementById("page-numbers");
  if (prevBtn) {
    prevBtn.disabled = state.currentPage <= 1;
    prevBtn.setAttribute("aria-disabled", state.currentPage <= 1 ? "true" : "false");
  }
  if (nextBtn) {
    nextBtn.disabled = state.currentPage >= totalPages;
    nextBtn.setAttribute("aria-disabled", state.currentPage >= totalPages ? "true" : "false");
  }
  if (pageNumbers) {
    pageNumbers.textContent = `${state.currentPage} of ${totalPages || 1}`;
  }
  document.querySelectorAll(".sortable").forEach((th) => {
    th.classList.remove("sort-asc", "sort-desc");
    if (th.dataset.column === state.currentSort.column) {
      th.classList.add(`sort-${state.currentSort.direction}`);
    }
  });
};
var setupEventListeners = (applicationData, state) => {
  const debouncedFilterData = () => {
    if (state.searchDebounceTimer) {
      clearTimeout(state.searchDebounceTimer);
    }
    state.searchDebounceTimer = setTimeout(() => {
      filterData(applicationData, state, true);
      state.searchDebounceTimer = null;
    }, 300);
  };
  const searchInput = document.getElementById("search-filter");
  const statusSelect = document.getElementById("status-filter");
  const interestSelect = document.getElementById("interest-filter");
  const overdueSelect = document.getElementById("overdue-filter");
  searchInput?.addEventListener("input", debouncedFilterData);
  statusSelect?.addEventListener("change", () => filterData(applicationData, state));
  interestSelect?.addEventListener("change", () => filterData(applicationData, state));
  overdueSelect?.addEventListener("change", () => filterData(applicationData, state));
  const pageSizeSelect = document.getElementById("page-size");
  pageSizeSelect?.addEventListener("change", function() {
    const select = this;
    state.pageSize = parseInt(select.value, 10);
    state.currentPage = 1;
    updateDisplay(state);
  });
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");
  prevBtn?.addEventListener("click", () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      updateDisplay(state);
    }
  });
  nextBtn?.addEventListener("click", () => {
    const totalPages = Math.ceil(state.filteredData.length / state.pageSize);
    if (state.currentPage < totalPages) {
      state.currentPage++;
      updateDisplay(state);
    }
  });
  document.querySelectorAll(".sortable").forEach((th) => {
    th.addEventListener("click", function() {
      const column = this.dataset.column;
      if (!column)
        return;
      if (state.currentSort.column === column) {
        state.currentSort.direction = state.currentSort.direction === "asc" ? "desc" : "asc";
      } else {
        state.currentSort.column = column;
        state.currentSort.direction = "asc";
      }
      updateDisplay(state);
    });
  });
  document.body.addEventListener("htmx:beforeRequest", (evt) => {
    console.log("HTMX: Starting request to", evt.detail.requestConfig.url);
  });
};
function initializePipelineClient(applicationData, config) {
  if (applicationData.length > config.maxSerializedRecords) {
    console.warn(`Large dataset detected (${applicationData.length} records). Consider implementing server-side pagination for better performance.`);
  }
  const state = {
    currentSort: { column: "updatedAt", direction: "desc" },
    currentPage: 1,
    pageSize: config.initialPageSize,
    filteredData: [...applicationData],
    searchDebounceTimer: null
  };
  setupEventListeners(applicationData, state);
  updateDisplay(state);
}
window.initializePipelineClient = initializePipelineClient;
