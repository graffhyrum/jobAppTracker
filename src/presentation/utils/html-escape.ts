/** OWASP HTML entity encoding for the five dangerous characters. NOT idempotent. */
export function escapeHtml(s: string): string {
	return s
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#x27;");
}

const ALLOWED_SCHEME_RE = /^https?:/i;

/**
 * Validates and escapes a URL for use in href attributes.
 *
 * Allows http:, https:, and relative paths starting with /.
 * Rejects javascript:, data:, vbscript:, protocol-relative //urls, mailto:, tel:,
 * and bare paths without leading /.
 * Returns empty string for invalid or empty input.
 */
export function safeHref(url: string): string {
	if (!url) return "";

	const trimmed = url.trim();
	if (!trimmed) return "";

	// Reject protocol-relative URLs
	if (trimmed.startsWith("//")) return "";

	// Absolute URLs: only http(s) allowed
	if (trimmed.includes(":")) {
		if (ALLOWED_SCHEME_RE.test(trimmed)) return escapeHtml(trimmed);
		// Any other scheme (javascript:, data:, vbscript:, mailto:, tel:, etc.)
		return "";
	}

	// Relative paths must start with /
	if (!trimmed.startsWith("/")) return "";

	return escapeHtml(trimmed);
}

/**
 * Escapes a pre-stringified JSON string for safe embedding inside a <script> tag.
 *
 * Prevents:
 * - Premature script close via </script>
 * - HTML comment injection via <!--
 * - Line separator (U+2028) and paragraph separator (U+2029) which break JS string literals
 */
export function escapeScriptContent(s: string): string {
	return s
		.replaceAll("</script>", "<\\/script>")
		.replaceAll("<!--", "<\\!--")
		.replaceAll("\u2028", "\\u2028")
		.replaceAll("\u2029", "\\u2029");
}
