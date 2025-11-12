import { type } from "arktype";

// Pipeline query parameter validation
export const pipelineQuerySchema = type({
	"sortColumn?":
		"'company'|'positionTitle'|'applicationDate'|'status'|'interestRating'|'nextEventDate'|'updatedAt'",
	"sortDirection?": "'asc'|'desc'",
});
