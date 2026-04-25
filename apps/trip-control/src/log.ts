export interface ServiceLogEntry {
  level?: "info" | "warn" | "error"
  component: string
  event: string
  message: string
  meta?: Record<string, unknown>
}

export function logEvent(entry: ServiceLogEntry): void {
  process.stdout.write(`${JSON.stringify({
    level: entry.level ?? "info",
    time: new Date().toISOString(),
    component: entry.component,
    event: entry.event,
    message: entry.message,
    ...(entry.meta ? { meta: entry.meta } : {}),
  })}\n`)
}
