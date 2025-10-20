// Type definitions for HTMX integration
// https://htmx.org/

export interface HtmxRequestConfig {
	url: string;
	method?: string;
	headers?: Record<string, string>;
	target?: HTMLElement;
	swap?: string;
}

export interface HtmxXHR {
	status: number;
	responseText: string;
	getAllResponseHeaders: () => string;
}

export interface HtmxBeforeRequestDetail {
	requestConfig: HtmxRequestConfig;
	xhr: XMLHttpRequest;
}

export interface HtmxAfterRequestDetail {
	requestConfig: HtmxRequestConfig;
	xhr: HtmxXHR;
	successful: boolean;
	failed: boolean;
}

export interface HtmxResponseErrorDetail {
	requestConfig: HtmxRequestConfig;
	xhr: HtmxXHR;
}

export interface HtmxSendErrorDetail {
	requestConfig: HtmxRequestConfig;
	error: Error;
}

export interface HtmxAPI {
	process: (element: HTMLElement | Document) => void;
	on: (event: string, listener: (detail: unknown) => void) => void;
	off: (event: string, listener: (detail: unknown) => void) => void;
	trigger: (element: HTMLElement, name: string, detail?: unknown) => void;
}

declare global {
	interface Window {
		htmx?: HtmxAPI;
		initializePipelineClient?: PipelineClient;
		addErrorNotification?: (message: string) => void;
		clearAllNotifications?: () => void;
	}

	interface HTMLElementEventMap {
		"htmx:beforeRequest": CustomEvent<HtmxBeforeRequestDetail>;
		"htmx:afterRequest": CustomEvent<HtmxAfterRequestDetail>;
		"htmx:responseError": CustomEvent<HtmxResponseErrorDetail>;
		"htmx:sendError": CustomEvent<HtmxSendErrorDetail>;
	}
}
