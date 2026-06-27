import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// Headroom proxy URL for live metrics reporting
const HEADROOM_PROXY_URL = process.env.HEADROOM_PROXY_URL || "http://localhost:8787";

// Debounce reporting to avoid flooding the proxy
let lastReportTime = 0;
const REPORT_INTERVAL_MS = 5000; // Report at most every 5 seconds

async function reportToHeadroomProxy(): Promise<void> {
	const now = Date.now();
	if (now - lastReportTime < REPORT_INTERVAL_MS) return;
	lastReportTime = now;

	try {
		const summary = calculateSummary();
		const payload = {
			session: {
				commands: sessionMetrics.length,
				input_tokens: summary.totalOriginalChars,
				output_tokens: summary.totalFilteredChars,
				tokens_saved: summary.totalSavedChars,
				savings_pct: summary.overallSavingsPercent,
			},
		};

		await fetch(`${HEADROOM_PROXY_URL}/api/rtk-metrics`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		}).catch(() => {
			// Silently fail if proxy is not running
		});
	} catch {
		// Silently fail
	}
}

export interface MetricRecord {
	timestamp: string;
	tool: string;
	technique: string;
	originalChars: number;
	filteredChars: number;
	savingsPercent: number;
}

export interface PersistedMetrics {
	sessionStart: string;
	lastUpdated: string;
	totalRecords: number;
	records: MetricRecord[];
	summary: {
		totalOriginalChars: number;
		totalFilteredChars: number;
		totalSavedChars: number;
		overallSavingsPercent: number;
		byTool: Record<string, {
			count: number;
			originalChars: number;
			filteredChars: number;
			savedChars: number;
			savingsPercent: number;
		}>;
	};
	// Session data for Headroom proxy dashboard
	session?: {
		commands: number;
		input_tokens: number;
		output_tokens: number;
		tokens_saved: number;
		savings_pct: number;
		total_time_ms: number;
	};
}

const METRICS_DIR = join(homedir(), ".pi", "agent");
const METRICS_FILE = join(METRICS_DIR, "rtk-metrics.json");

const sessionMetrics: MetricRecord[] = [];
let sessionStart = new Date().toISOString();

function ensureMetricsDir(): void {
	if (!existsSync(METRICS_DIR)) {
		mkdirSync(METRICS_DIR, { recursive: true });
	}
}

function calculateSummary(): PersistedMetrics["summary"] {
	const totalOriginalChars = sessionMetrics.reduce((sum, m) => sum + m.originalChars, 0);
	const totalFilteredChars = sessionMetrics.reduce((sum, m) => sum + m.filteredChars, 0);
	const totalSavedChars = totalOriginalChars - totalFilteredChars;
	const overallSavingsPercent = totalOriginalChars > 0
		? Math.round((totalSavedChars / totalOriginalChars) * 100 * 100) / 100
		: 0;

	const byTool: PersistedMetrics["summary"]["byTool"] = {};

	for (const m of sessionMetrics) {
		if (!byTool[m.tool]) {
			byTool[m.tool] = { count: 0, originalChars: 0, filteredChars: 0, savedChars: 0, savingsPercent: 0 };
		}
		byTool[m.tool].count++;
		byTool[m.tool].originalChars += m.originalChars;
		byTool[m.tool].filteredChars += m.filteredChars;
	}

	for (const tool of Object.keys(byTool)) {
		const t = byTool[tool];
		t.savedChars = t.originalChars - t.filteredChars;
		t.savingsPercent = t.originalChars > 0
			? Math.round((t.savedChars / t.originalChars) * 100 * 100) / 100
			: 0;
	}

	return {
		totalOriginalChars,
		totalFilteredChars,
		totalSavedChars,
		overallSavingsPercent,
		byTool,
	};
}

export function persistMetrics(): void {
	try {
		ensureMetricsDir();
		const summary = calculateSummary();
		const data: PersistedMetrics = {
			sessionStart,
			lastUpdated: new Date().toISOString(),
			totalRecords: sessionMetrics.length,
			records: sessionMetrics,
			summary,
			// Add session section for Headroom proxy dashboard
			session: {
				commands: sessionMetrics.length,
				input_tokens: summary.totalOriginalChars,
				output_tokens: summary.totalFilteredChars,
				tokens_saved: summary.totalSavedChars,
				savings_pct: summary.overallSavingsPercent,
				total_time_ms: 0,
			},
		};
		writeFileSync(METRICS_FILE, JSON.stringify(data, null, 2), "utf-8");
	} catch {
		// Silently fail - don't break the session if persistence fails
	}
}

export function loadPersistedMetrics(): MetricRecord[] {
	try {
		if (existsSync(METRICS_FILE)) {
			const raw = readFileSync(METRICS_FILE, "utf-8");
			const data: PersistedMetrics = JSON.parse(raw);
			const records = data.records || [];
			// Load into session metrics array
			sessionMetrics.length = 0;
			sessionMetrics.push(...records);
			return records;
		}
	} catch {
		// Ignore parse errors
	}
	return [];
}

export function getPersistedMetricsSummary(): PersistedMetrics | null {
	try {
		if (existsSync(METRICS_FILE)) {
			const raw = readFileSync(METRICS_FILE, "utf-8");
			return JSON.parse(raw);
		}
	} catch {
		// Ignore
	}
	return null;
}

export function trackSavings(
	original: string,
	filtered: string,
	tool: string,
	technique: string
): MetricRecord {
	const originalChars = original.length;
	const filteredChars = filtered.length;
	const savingsPercent =
		originalChars > 0
			? Math.round(((originalChars - filteredChars) / originalChars) * 100 * 100) / 100
			: 0;

	const record: MetricRecord = {
		timestamp: new Date().toISOString(),
		tool,
		technique,
		originalChars,
		filteredChars,
		savingsPercent,
	};

	sessionMetrics.push(record);

	// Persist after every tracked event
	persistMetrics();

	// Report to Headroom proxy for dashboard display
	reportToHeadroomProxy();

	return record;
}

export function getSessionMetrics(): MetricRecord[] {
	return [...sessionMetrics];
}

export function clearMetrics(): void {
	sessionMetrics.length = 0;
	sessionStart = new Date().toISOString();
	persistMetrics();
}

function progressBar(percent: number, width = 24): string {
	const filled = Math.round((percent / 100) * width);
	const empty = width - filled;
	return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${percent.toFixed(1)}%`;
}

function col(s: string, width: number): string {
	return s.length >= width ? s.slice(0, width) : s + " ".repeat(width - s.length);
}

export function getMetricsSummary(): string {
	if (sessionMetrics.length === 0) {
		return "No metrics recorded yet";
	}

	const totalOriginal = sessionMetrics.reduce((sum, m) => sum + m.originalChars, 0);
	const totalFiltered = sessionMetrics.reduce((sum, m) => sum + m.filteredChars, 0);
	const totalSaved = totalOriginal - totalFiltered;
	const overallPct = totalOriginal > 0 ? (totalSaved / totalOriginal) * 100 : 0;

	const byTool = sessionMetrics.reduce((acc, m) => {
		if (!acc[m.tool]) {
			acc[m.tool] = { count: 0, originalChars: 0, filteredChars: 0 };
		}
		acc[m.tool].count++;
		acc[m.tool].originalChars += m.originalChars;
		acc[m.tool].filteredChars += m.filteredChars;
		return acc;
	}, {} as Record<string, { count: number; originalChars: number; filteredChars: number }>);

	const W = 54;
	const bar = "─".repeat(W);

	let s = `\n`;
	s += `  RTK Token Savings\n`;
	s += `  ${"═".repeat(W)}\n`;
	s += `  Overall  ${progressBar(overallPct, 28)}\n`;
	s += `  ${bar}\n`;
	s += `  ${col("Metric", 22)} ${col("Value", 16)} Notes\n`;
	s += `  ${bar}\n`;
	s += `  ${col("Total calls", 22)} ${col(sessionMetrics.length.toString(), 16)}\n`;
	s += `  ${col("Original chars", 22)} ${col(totalOriginal.toLocaleString(), 16)}\n`;
	s += `  ${col("Filtered chars", 22)} ${col(totalFiltered.toLocaleString(), 16)} ${totalSaved.toLocaleString()} saved\n`;
	s += `  ${bar}\n`;

	s += `\n  By tool:\n`;
	s += `  ${col("Tool", 10)} ${col("Calls", 8)} ${col("Original", 12)} ${col("Filtered", 12)}  Savings\n`;
	s += `  ${"─".repeat(62)}\n`;
	for (const [tool, data] of Object.entries(byTool)) {
		const pct = data.originalChars > 0 ? (1 - data.filteredChars / data.originalChars) * 100 : 0;
		s += `  ${col(tool, 10)} ${col(data.count.toString(), 8)} ${col(data.originalChars.toLocaleString(), 12)} ${col(data.filteredChars.toLocaleString(), 12)}  ${progressBar(pct, 16)}\n`;
	}
	s += `  ${"─".repeat(62)}\n`;

	return s;
}

export function getLastMetrics(n: number): MetricRecord[] {
	return sessionMetrics.slice(-n);
}
