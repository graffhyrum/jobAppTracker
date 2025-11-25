var X = (q) => {
		return new Date(q).toISOString();
	},
	Y = (q) => {
		if (!q) return "";
		return "★".repeat(q) + "☆".repeat(3 - q);
	},
	Z = (q, k, H) => {
		return [...q].sort((M, O) => {
			let w = M[k],
				A = O[k];
			if (k === "applicationDate" || k === "updatedAt" || k === "nextEventDate")
				(w = w && typeof w === "string" ? new Date(w).getTime() : 0),
					(A = A && typeof A === "string" ? new Date(A).getTime() : 0);
			if (k === "interestRating")
				(w = M.interestRating || 0), (A = O.interestRating || 0);
			if (typeof w === "string" && typeof A === "string")
				(w = w.toLowerCase()), (A = A.toLowerCase());
			const K = typeof w === "number" ? w : 0,
				G = typeof A === "number" ? A : 0;
			if (typeof w === "string" && typeof A === "string")
				if (H === "asc") return w < A ? -1 : w > A ? 1 : 0;
				else return w > A ? -1 : w < A ? 1 : 0;
			if (H === "asc") return K < G ? -1 : K > G ? 1 : 0;
			else return K > G ? -1 : K < G ? 1 : 0;
		});
	},
	W = (q, k, H = !0) => {
		const M = document.getElementById("search-filter"),
			O = document.getElementById("status-filter"),
			w = document.getElementById("interest-filter"),
			A = document.getElementById("overdue-filter"),
			K = M?.value?.toLowerCase() || "",
			G = O?.value || "",
			Q = w?.value || "",
			J = A?.value || "";
		if (
			((k.filteredData = q.filter((j) => {
				if (G) {
					if (G === "active" || G === "inactive") {
						if (j.statusCategory !== G) return !1;
					} else if (j.status !== G) return !1;
				}
				if (Q && j.interestRating !== parseInt(Q, 10)) return !1;
				if (J === "overdue" && !j.isOverdue) return !1;
				if (J === "upcoming" && (!j.nextEventDate || j.isOverdue)) return !1;
				if (
					K &&
					!j.company.toLowerCase().includes(K) &&
					!j.positionTitle.toLowerCase().includes(K)
				)
					return !1;
				return !0;
			})),
			k.currentPage !== 1)
		)
			k.currentPage = 1;
		if (H) U(k);
	},
	U = (q) => {
		const k = Z(q.filteredData, q.currentSort.column, q.currentSort.direction),
			H = (q.currentPage - 1) * q.pageSize,
			M = H + q.pageSize,
			O = k.slice(H, M),
			w = document.getElementById("applications-tbody");
		if (!w) return;
		if (O.length === 0)
			w.innerHTML =
				'<tr><td colspan="8" class="empty-state">No applications found</td></tr>';
		else if (
			((w.innerHTML = O.map(
				(j) => `
			<tr class="application-row ${j.statusCategory} ${j.isOverdue ? "overdue" : ""}" data-testid="application-row-${j.id}">
				<td class="company-cell" data-testid="company-cell-${j.id}">${j.company}</td>
				<td class="position-cell" data-testid="position-cell-${j.id}">${j.positionTitle}</td>
				<td class="status-cell" data-testid="status-cell-${j.id}">
					<span class="status-badge ${j.statusCategory}" data-testid="status-badge-${j.id}">${j.status}</span>
				</td>
				<td class="application-date-cell" data-testid="application-date-cell-${j.id}">${X(j.applicationDate)}</td>
				<td class="updated-date-cell" data-testid="updated-date-cell-${j.id}">${X(j.updatedAt)}</td>
				<td class="interest-cell" data-testid="interest-cell-${j.id}">${Y(j.interestRating)}</td>
				<td class="next-event-cell" data-testid="next-event-cell-${j.id}">
					${j.nextEventDate ? `<span class="${j.isOverdue ? "overdue-date" : ""}" data-testid="next-event-date-${j.id}">${X(j.nextEventDate)}</span>` : `<span class="no-date" data-testid="no-next-event-${j.id}">No date set</span>`}
				</td>
				<td class="actions-cell" data-testid="actions-cell-${j.id}">
					<button
						class="action-btn edit"
						data-testid="edit-btn-${j.id}"
						hx-get="/applications/${j.id}/edit"
						hx-target="closest tr"
						hx-swap="outerHTML"
						title="Edit Application">✏️</button>
					<button class="action-btn view" data-testid="view-btn-${j.id}" title="View Details">\uD83D\uDC41️</button>
				</td>
			</tr>
		`,
			).join("")),
			typeof window.htmx < "u" && window.htmx)
		)
			window.htmx.process(w);
		const A = Math.ceil(q.filteredData.length / q.pageSize),
			K = document.getElementById("pagination-info");
		if (K)
			K.textContent = `Showing ${H + 1}-${Math.min(M, q.filteredData.length)} of ${q.filteredData.length} applications`;
		const G = document.getElementById("prev-page"),
			Q = document.getElementById("next-page"),
			J = document.getElementById("page-numbers");
		if (G)
			(G.disabled = q.currentPage <= 1),
				G.setAttribute("aria-disabled", q.currentPage <= 1 ? "true" : "false");
		if (Q)
			(Q.disabled = q.currentPage >= A),
				Q.setAttribute("aria-disabled", q.currentPage >= A ? "true" : "false");
		if (J) J.textContent = `${q.currentPage} of ${A || 1}`;
		document.querySelectorAll(".sortable").forEach((j) => {
			if (
				(j.classList.remove("sort-asc", "sort-desc"),
				j.dataset.column === q.currentSort.column)
			)
				j.classList.add(`sort-${q.currentSort.direction}`);
		});
	},
	_ = (q, k) => {
		const H = () => {
				if (k.searchDebounceTimer) clearTimeout(k.searchDebounceTimer);
				k.searchDebounceTimer = setTimeout(() => {
					W(q, k, !0), (k.searchDebounceTimer = null);
				}, 300);
			},
			M = document.getElementById("search-filter"),
			O = document.getElementById("status-filter"),
			w = document.getElementById("interest-filter"),
			A = document.getElementById("overdue-filter");
		M?.addEventListener("input", H),
			O?.addEventListener("change", () => W(q, k)),
			w?.addEventListener("change", () => W(q, k)),
			A?.addEventListener("change", () => W(q, k)),
			document
				.getElementById("page-size")
				?.addEventListener("change", function () {
					(k.pageSize = parseInt(this.value, 10)), (k.currentPage = 1), U(k);
				});
		const G = document.getElementById("prev-page"),
			Q = document.getElementById("next-page");
		G?.addEventListener("click", () => {
			if (k.currentPage > 1) k.currentPage--, U(k);
		}),
			Q?.addEventListener("click", () => {
				const J = Math.ceil(k.filteredData.length / k.pageSize);
				if (k.currentPage < J) k.currentPage++, U(k);
			}),
			document.querySelectorAll(".sortable").forEach((J) => {
				J.addEventListener("click", function () {
					const j = this.dataset.column;
					if (!j) return;
					if (k.currentSort.column === j)
						k.currentSort.direction =
							k.currentSort.direction === "asc" ? "desc" : "asc";
					else (k.currentSort.column = j), (k.currentSort.direction = "asc");
					U(k);
				});
			}),
			document.body.addEventListener("htmx:beforeRequest", (J) => {
				console.log("HTMX: Starting request to", J.detail.requestConfig.url);
			});
	};
function $(q, k) {
	if (q.length > k.maxSerializedRecords)
		console.warn(
			`Large dataset detected (${q.length} records). Consider implementing server-side pagination for better performance.`,
		);
	const H = {
		currentSort: { column: "updatedAt", direction: "desc" },
		currentPage: 1,
		pageSize: k.initialPageSize,
		filteredData: [...q],
		searchDebounceTimer: null,
	};
	_(q, H), U(H);
}
window.initializePipelineClient = $;
