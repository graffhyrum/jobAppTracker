import type {
	Contact,
	ContactChannel,
	ContactRole,
} from "../entities/contact.ts";
import type { JobApplication } from "../entities/job-application.ts";
import { getCurrentStatus } from "../entities/job-application.ts";

/**
 * Contact analytics data structures
 */

export type ResponseRateByChannel = {
	channel: ContactChannel;
	total: number;
	responses: number;
	responseRate: number; // responses / total
};

export type ResponseRateByRole = {
	role: ContactRole | "unknown";
	total: number;
	responses: number;
	responseRate: number; // responses / total
};

export type ContactCountCorrelation = {
	contactCount: string; // "0", "1-2", "3-5", "6+"
	applications: number;
	activeRate: number;
	offerRate: number;
	rejectionRate: number;
};

export type ContactAnalytics = {
	totalContacts: number;
	averageContactsPerApplication: number;
	applicationsWithContacts: number;
	applicationsWithoutContacts: number;
	averageDaysToResponse: number;
	medianDaysToResponse: number;
	responseRateByChannel: ResponseRateByChannel[];
	responseRateByRole: ResponseRateByRole[];
	contactCountCorrelation: ContactCountCorrelation[];
};

/**
 * Compute contact analytics from applications and contacts
 */
export function computeContactAnalytics(
	applications: JobApplication[],
	contacts: Contact[],
): ContactAnalytics {
	// Group contacts by job application
	const contactsByApp = new Map<string, Contact[]>();
	for (const contact of contacts) {
		const appContacts = contactsByApp.get(contact.jobApplicationId) ?? [];
		appContacts.push(contact);
		contactsByApp.set(contact.jobApplicationId, appContacts);
	}

	return {
		totalContacts: contacts.length,
		averageContactsPerApplication: computeAverageContactsPerApplication(
			applications,
			contactsByApp,
		),
		applicationsWithContacts: contactsByApp.size,
		applicationsWithoutContacts: applications.length - contactsByApp.size,
		averageDaysToResponse: computeAverageDaysToResponse(contacts),
		medianDaysToResponse: computeMedianDaysToResponse(contacts),
		responseRateByChannel: computeResponseRateByChannel(contacts),
		responseRateByRole: computeResponseRateByRole(contacts),
		contactCountCorrelation: computeContactCountCorrelation(
			applications,
			contactsByApp,
		),
	};
}

function computeAverageContactsPerApplication(
	applications: JobApplication[],
	contactsByApp: Map<string, Contact[]>,
): number {
	if (applications.length === 0) return 0;

	let totalContacts = 0;
	for (const app of applications) {
		const contacts = contactsByApp.get(app.id) ?? [];
		totalContacts += contacts.length;
	}

	return totalContacts / applications.length;
}

function computeAverageDaysToResponse(contacts: Contact[]): number {
	const responsesWithDays: number[] = [];

	for (const contact of contacts) {
		if (contact.responseReceived) {
			// For simplicity, we'll use the time from outreach to "now" as proxy
			// In a real implementation, you might want to track actual response date
			const outreachTime = new Date(contact.outreachDate).getTime();
			const responseTime = new Date(contact.updatedAt).getTime();
			const days = (responseTime - outreachTime) / (1000 * 60 * 60 * 24);
			responsesWithDays.push(days);
		}
	}

	if (responsesWithDays.length === 0) return 0;

	const sum = responsesWithDays.reduce((acc, val) => acc + val, 0);
	return sum / responsesWithDays.length;
}

function computeMedianDaysToResponse(contacts: Contact[]): number {
	const responsesWithDays: number[] = [];

	for (const contact of contacts) {
		if (contact.responseReceived) {
			const outreachTime = new Date(contact.outreachDate).getTime();
			const responseTime = new Date(contact.updatedAt).getTime();
			const days = (responseTime - outreachTime) / (1000 * 60 * 60 * 24);
			responsesWithDays.push(days);
		}
	}

	if (responsesWithDays.length === 0) return 0;

	const sorted = [...responsesWithDays].sort((a, b) => a - b);

	if (sorted.length % 2 === 0) {
		const mid1 = sorted[sorted.length / 2 - 1];
		const mid2 = sorted[sorted.length / 2];
		if (mid1 !== undefined && mid2 !== undefined) {
			return (mid1 + mid2) / 2;
		}
	} else {
		const mid = sorted[Math.floor(sorted.length / 2)];
		if (mid !== undefined) {
			return mid;
		}
	}

	return 0;
}

function computeResponseRateByChannel(
	contacts: Contact[],
): ResponseRateByChannel[] {
	const channelMap = new Map<
		ContactChannel,
		{ total: number; responses: number }
	>();

	for (const contact of contacts) {
		const existing = channelMap.get(contact.channel) ?? {
			total: 0,
			responses: 0,
		};

		existing.total++;
		if (contact.responseReceived) {
			existing.responses++;
		}

		channelMap.set(contact.channel, existing);
	}

	return Array.from(channelMap.entries()).map(([channel, data]) => ({
		channel,
		total: data.total,
		responses: data.responses,
		responseRate: data.total > 0 ? data.responses / data.total : 0,
	}));
}

function computeResponseRateByRole(contacts: Contact[]): ResponseRateByRole[] {
	const roleMap = new Map<
		ContactRole | "unknown",
		{ total: number; responses: number }
	>();

	for (const contact of contacts) {
		const role = contact.role ?? "unknown";
		const existing = roleMap.get(role) ?? { total: 0, responses: 0 };

		existing.total++;
		if (contact.responseReceived) {
			existing.responses++;
		}

		roleMap.set(role, existing);
	}

	return Array.from(roleMap.entries()).map(([role, data]) => ({
		role,
		total: data.total,
		responses: data.responses,
		responseRate: data.total > 0 ? data.responses / data.total : 0,
	}));
}

function computeContactCountCorrelation(
	applications: JobApplication[],
	contactsByApp: Map<string, Contact[]>,
): ContactCountCorrelation[] {
	// Define buckets for contact counts
	const buckets: ContactCountCorrelation[] = [
		{
			contactCount: "0",
			applications: 0,
			activeRate: 0,
			offerRate: 0,
			rejectionRate: 0,
		},
		{
			contactCount: "1-2",
			applications: 0,
			activeRate: 0,
			offerRate: 0,
			rejectionRate: 0,
		},
		{
			contactCount: "3-5",
			applications: 0,
			activeRate: 0,
			offerRate: 0,
			rejectionRate: 0,
		},
		{
			contactCount: "6+",
			applications: 0,
			activeRate: 0,
			offerRate: 0,
			rejectionRate: 0,
		},
	];

	// Categorize applications by contact count
	for (const app of applications) {
		const contacts = contactsByApp.get(app.id) ?? [];
		const count = contacts.length;

		let bucketIndex = 0;
		if (count === 0) bucketIndex = 0;
		else if (count >= 1 && count <= 2) bucketIndex = 1;
		else if (count >= 3 && count <= 5) bucketIndex = 2;
		else bucketIndex = 3;

		const bucket = buckets[bucketIndex];
		if (!bucket) continue;

		bucket.applications++;

		const statusResult = getCurrentStatus(app);
		if (statusResult.isOk()) {
			const status = statusResult.value;
			if (status.category === "active") {
				if (status.label === "offer") {
					bucket.offerRate++;
				}
			} else {
				if (status.label === "rejected") {
					bucket.rejectionRate++;
				}
			}
		}
	}

	// Calculate rates
	for (const bucket of buckets) {
		if (bucket.applications > 0) {
			bucket.activeRate =
				(bucket.applications - bucket.offerRate - bucket.rejectionRate) /
				bucket.applications;
			bucket.offerRate = bucket.offerRate / bucket.applications;
			bucket.rejectionRate = bucket.rejectionRate / bucket.applications;
		}
	}

	return buckets;
}
