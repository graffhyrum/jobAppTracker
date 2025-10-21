import { type } from "arktype";

// Pipeline query parameter validation
export const pipelineQuerySchema = type({
	"sortColumn?":
		"'company'|'position'|'applicationDate'|'status'|'interestRating'|'nextEventDate'|'lastUpdated'",
	"sortDirection?": "'asc'|'desc'",
});
