import { appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { EnvKeys } from "./constants.js";

const isDebug = process.env[EnvKeys.DEBUG] === "true" || process.env[EnvKeys.DEBUG] === "1";
const logFile = process.env[EnvKeys.LOG_FILE] || "";
const logFilePath = logFile ? resolve(logFile) : "";

// Create/truncate log file on startup
if (logFilePath) {
  writeFileSync(logFilePath, `--- xbot-ai started at ${new Date().toISOString()} ---\n`);
}

function timestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

function write(line: string): void {
  console.log(line);
  if (logFilePath) {
    appendFileSync(logFilePath, line + "\n");
  }
}

export function log(message: string): void {
  write(`[${timestamp()}] ${message}`);
}

export function debug(label: string, data?: unknown): void {
  if (!isDebug) return;

  const prefix = `[${timestamp()}] [DEBUG:${label}]`;

  if (data === undefined) {
    write(prefix);
    return;
  }

  if (typeof data === "string") {
    if (data.length > 120) {
      write(`${prefix}\n${"─".repeat(60)}\n${data}\n${"─".repeat(60)}`);
    } else {
      write(`${prefix} ${data}`);
    }
    return;
  }

  write(`${prefix}\n${JSON.stringify(data, null, 2)}`);
}
