export type Root = Root2[];

export interface Root2 {
	id: number;
	job_url?: string;
	job_board?: JobBoard;
	is_remote?: boolean;
	job_title: string;
	job_application_context: string;
	description?: string;
	archived_at: string;
	created_at: string;
	updated_at: string;
	company_name: string;
	company: Company;
	interest?: number;
	job_rec_id?: number;
	stages: Stage[];
	sourced_job: unknown;
	result: Result;
	notes?: string;
	strategies: unknown[];
	status: string;
	pipeline_connections: PipelineConnection[];
}

export interface JobBoard {
	id: number;
	root_domain: string;
	domains: string[];
	name: string;
	created_at: string;
	updated_at: string;
}

export interface Company {
	id: number;
}

export interface Stage {
	id: number;
	date: string;
	notes?: string;
	round: number;
	finalRound: boolean;
	created_at: string;
	interview_type: string;
	company_id?: number;
	is_interview: boolean;
	questions: Question[];
}

export interface Question {
	id: number;
	title: string;
}

export interface Result {
	id: number;
	outcome: string;
	date: string;
	notes: unknown;
}

export interface PipelineConnection {
	id: number;
	channel: string;
	user: User;
	contact: Contact;
	created_at: string;
	updated_at: string;
	outreach_date: string;
}

export interface User {
	id: number;
	full_name: string;
}

export interface Contact {
	id: number;
	contact_name: string;
	contact_email: string;
	linkedin_url: string;
	contact_role: string;
}
