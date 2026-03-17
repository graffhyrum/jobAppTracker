import { scope } from "arktype";

const baseDataScope = scope({
	Root: {
		$schema: "string",
		data: "Datum[]",
	},
	Datum: {
		id: "number",
		job_url: "string?",
		job_board: "JobBoard?",
		is_remote: "boolean?",
		job_title: "string > 0",
		job_application_context: "string",
		description: "string?",
		archived_at: "string?",
		created_at: "string.date.iso",
		updated_at: "string.date.iso",
		company_name: "string > 0",
		company: "Company",
		interest: "number?",
		job_rec_id: "number?",
		stages: "Stage[]",
		sourced_job: "unknown",
		result: "Result?",
		notes: "string?",
		strategies: "string[]",
		status: "'Applied' | 'Archived'",
		pipeline_connections: "PipelineConnection[]",
		resume: "Resume?",
	},
	JobBoard: {
		id: "number",
		root_domain: "string > 0",
		domains: "string[]",
		name: "string > 0",
		created_at: "string.date.iso",
		updated_at: "string.date.iso",
	},
	Company: {
		id: "number",
	},
	Stage: {
		id: "number",
		date: "string?",
		notes: "string?",
		round: "number",
		finalRound: "boolean",
		created_at: "string.date.iso",
		interview_type: "string",
		company_id: "number?",
		is_interview: "boolean",
		questions: "Question[]",
	},
	Question: {
		id: "number",
		title: "string > 0",
	},
	Result: {
		id: "number",
		outcome:
			"'application_submitted' | 'screening_interview' | 'informational_interview' | 'interview' | 'online_test' | 'take_home_assignment' | 'onsite' | 'offer' | 'offer_uploaded' | 'qualified_offer' | 'non_qualified_offer' | 'rejection' | 'mistake' | 'lost_interest' | 'ghost' | 'freeze' | 'none_given'",
		date: "string",
		notes: "string?",
	},
	PipelineConnection: {
		id: "number",
		channel: "string",
		user: "User",
		contact: "Contact",
		created_at: "string.date.iso",
		updated_at: "string.date.iso",
		outreach_date: "string",
	},
	User: {
		id: "number",
		full_name: "string > 0",
	},
	Contact: {
		id: "number?",
		contact_name: "string?",
		contact_email: "string?",
		linkedin_url: "string?",
		contact_role: "string?",
	},
	Resume: {
		file_name: "string > 0",
		url: "string",
		type: "string",
	},
	BaseDataJobApplication: "Datum",
	BaseDataJobApplications: "Datum[]",
});

export const baseDataModule = baseDataScope.export();

export type BaseDataJobApplication = typeof baseDataModule.Datum.infer;
export type Root = typeof baseDataModule.Root.infer;
export type JobBoard = typeof baseDataModule.JobBoard.infer;
export type Company = typeof baseDataModule.Company.infer;
export type Stage = typeof baseDataModule.Stage.infer;
export type Result = typeof baseDataModule.Result.infer;
export type User = typeof baseDataModule.User.infer;
export type Contact = typeof baseDataModule.Contact.infer;
export type Resume = typeof baseDataModule.Resume.infer;

const jobApplicationResults = {
	application_submitted: "Applied",
	screening_interview: "Screening Interview",
	informational_interview: "Informational Interview",
	interview: "Interview",
	online_test: "Online Test",
	take_home_assignment: "Take-Home Assignment",
	onsite: "Onsite",
	offer: "Received Offer",
	offer_uploaded: "Offer Uploaded",
	qualified_offer: "Qualifying Offer",
	non_qualified_offer: "Non-Qualifying Offer",
	rejection: "Rejected",
	mistake: "Added on Mistake",
	lost_interest: "Not Interested",
	ghost: "Company never responded",
	freeze: "Hiring Freeze",
	none_given: "No Reason Specified",
};

export type JobApplicationResult = {
	outcome: keyof typeof jobApplicationResults | null;
	notes?: string;
};
