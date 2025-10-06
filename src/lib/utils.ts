import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function triggerN8nWebhook(event: string, payload: Record<string, unknown>): Promise<void> {
  const url = import.meta.env.VITE_N8N_WEBHOOK_URL
  if (!url) {
    // Silently skip if not configured
    return
  }

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ event, payload })
    })
    // Intentionally ignore response; webhook is fire-and-forget
  } catch (_err) {
    // Do not block UX on webhook failure
  }
}