import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

if (getApps().length === 0) initializeApp();

export const db = getFirestore();
const messaging = getMessaging();

/** Sends a high priority data message. The app builds the notification itself. */
export async function notify(uid: string, data: Record<string, string>): Promise<void> {
  const token = (await db.doc(`secrets/${uid}`).get()).get("fcmToken") as string | undefined;
  if (!token) return;
  try {
    await messaging.send({ token, data, android: { priority: "high" } });
  } catch (err) {
    console.error("notify failed", uid, err);
  }
}

/** The same id for both people, whoever asks first. */
export function pairIdOf(a: string, b: string): string {
  return [a, b].sort().join("_");
}

/** User ids of everyone with an active connection to this user. */
export async function activeConnections(uid: string): Promise<string[]> {
  const snap = await db
    .collection("connections")
    .where("members", "array-contains", uid)
    .where("status", "==", "active")
    .get();
  return snap.docs
    .map((d) => (d.get("members") as string[]).find((m) => m !== uid))
    .filter((m): m is string => typeof m === "string");
}
