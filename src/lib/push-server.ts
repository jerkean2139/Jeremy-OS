import webpush from "web-push";
import { listSubscriptions, deleteSubscription, type PushSub } from "./db";

// Server-side Web Push sender. Requires VAPID keys in env:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto: or https URL)
// Generate a keypair with:  npx web-push generate-vapid-keys

let configured = false;

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureConfigured() {
  if (configured) return;
  if (!isPushConfigured()) throw new Error("VAPID keys not configured");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:jeremy@keanonbiz.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Send a payload to every stored subscription. Prunes subscriptions that the
 * push service reports as gone (404/410). Returns how many were delivered.
 */
export async function sendToAll(payload: PushPayload): Promise<number> {
  ensureConfigured();
  const subs = await listSubscriptions();
  let delivered = 0;
  await Promise.all(
    subs.map(async (sub: PushSub) => {
      try {
        await webpush.sendNotification(sub as any, JSON.stringify(payload));
        delivered += 1;
      } catch (err: any) {
        const code = err?.statusCode;
        if (code === 404 || code === 410) {
          await deleteSubscription(sub.endpoint);
        }
      }
    })
  );
  return delivered;
}
