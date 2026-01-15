/**
 * Utilities to format relative times in short, long, or auto styles.
 *
 * Examples:
 * - just now
 * - 45s
 * - 5m
 * - 15 minutes ago
 * - 3 hours ago
 * - in 2 months
 * - in 5 years
 */

export type TimeStyle = "auto" | "short" | "long";

function isValidDate(d: Date) {
    return d instanceof Date && !isNaN(d.getTime());
}

function toDate(input: Date | number | string): Date {
    if (input instanceof Date) return input;
    if (typeof input === "number") return new Date(input);
    return new Date(input);
}

/** Long, human-friendly formatter (e.g. "just now", "45 seconds ago", "in 2 months") */
export function formatRelativeTimeLong(
    input: Date | number | string,
    now = new Date(),
    locale = "en"
): string {
    const d = toDate(input);
    if (!isValidDate(d)) return String(input);

    const diffMs = d.getTime() - now.getTime();
    const absSecs = Math.round(Math.abs(diffMs) / 1000);

    // tiny threshold
    if (absSecs < 5) return "just now";

    // Use Intl.RelativeTimeFormat when available for correct plurals & localization
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

    const seconds = Math.round(diffMs / 1000);
    if (Math.abs(seconds) < 60) return rtf.format(seconds, "second");

    const minutes = Math.round(diffMs / (1000 * 60));
    if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");

    const hours = Math.round(diffMs / (1000 * 60 * 60));
    if (Math.abs(hours) < 24) return rtf.format(hours, "hour");

    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (Math.abs(days) < 30) return rtf.format(days, "day");

    const months = Math.round(days / 30);
    if (Math.abs(months) < 12) return rtf.format(months, "month");

    const years = Math.round(days / 365);
    return rtf.format(years, "year");
}
