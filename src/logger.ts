const isDebug = process.env.DEBUG === "true" || process.env.DEBUG === "1";

function timestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

export function log(message: string): void {
  console.log(`[${timestamp()}] ${message}`);
}

export function debug(label: string, data?: unknown): void {
  if (!isDebug) return;

  const prefix = `[${timestamp()}] [DEBUG:${label}]`;

  if (data === undefined) {
    console.log(`${prefix}`);
    return;
  }

  if (typeof data === "string") {
    // For long strings, print with clear boundaries
    if (data.length > 120) {
      console.log(`${prefix}\n${"─".repeat(60)}\n${data}\n${"─".repeat(60)}`);
    } else {
      console.log(`${prefix} ${data}`);
    }
    return;
  }

  console.log(`${prefix}\n${JSON.stringify(data, null, 2)}`);
}
