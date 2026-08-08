export function formatTimestamp(timestamp: string, timezone: string): string {
    if (!timestamp) return "—";
    try {
        const isoString = timestamp.endsWith("Z") ? timestamp : `${timestamp}Z`;
        const date = new Date(isoString);

        return date.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: timezone,
        });
    } catch {
        return timestamp.slice(11, 16);
    }
}
