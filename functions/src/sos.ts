import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db, notify, activeConnections } from "./admin";

const REGION = "asia-south1";

function requireUid(request: CallableRequest): string {
  if (!request.auth) throw new HttpsError("unauthenticated", "Please log in");
  return request.auth.uid;
}

type Loc = { lat: number | null; lng: number | null; battery: number | null };

function readLocation(data: unknown): Loc {
  const d = (data ?? {}) as { lat?: unknown; lng?: unknown; battery?: unknown };
  const lat = typeof d.lat === "number" && d.lat >= -90 && d.lat <= 90 ? d.lat : null;
  const lng = typeof d.lng === "number" && d.lng >= -180 && d.lng <= 180 ? d.lng : null;
  const battery =
    typeof d.battery === "number" && d.battery >= 0 && d.battery <= 100 ? Math.round(d.battery) : null;
  return { lat, lng, battery };
}

async function writeLocation(uid: string, loc: Loc): Promise<void> {
  if (loc.lat === null || loc.lng === null) return;
  await db.doc(`locations/${uid}`).set({
    lat: loc.lat,
    lng: loc.lng,
    battery: loc.battery,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/** SOS started: status Unsafe, Track me on, everyone connected gets a notification. */
export const startSos = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  const loc = readLocation(request.data);
  const userRef = db.doc(`users/${uid}`);
  const user = await userRef.get();
  const wasUnsafe = user.get("unsafe") === true;

  if (!wasUnsafe) {
    // Remember the Track me setting, so Safe can restore it.
    await db.doc(`secrets/${uid}`).set({ prevTrackMe: user.get("trackMe") !== false }, { merge: true });
  }
  await userRef.set({ unsafe: true, trackMe: true }, { merge: true });
  await writeLocation(uid, loc);
  if (wasUnsafe) return { notified: 0 }; // do not send the same alert again

  const nickname = String(user.get("nickname") ?? "Someone");
  const others = await activeConnections(uid);
  await Promise.all(
    others.map((o) =>
      notify(o, { type: "sos", fromUid: uid, nickname, lat: String(loc.lat ?? ""), lng: String(loc.lng ?? "") })
    )
  );
  return { notified: others.length };
});

/** The phone calls this every 10 to 15 seconds while Track me is on or during SOS. */
export const updateLocation = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  const user = await db.doc(`users/${uid}`).get();
  if (user.get("trackMe") !== true && user.get("unsafe") !== true) return { stored: false };
  await writeLocation(uid, readLocation(request.data));
  return { stored: true };
});

export const setTrackMe = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  const value = (request.data as { value?: unknown })?.value;
  if (typeof value !== "boolean") throw new HttpsError("invalid-argument", "bad request");
  const ref = db.doc(`users/${uid}`);
  await ref.set({ trackMe: value }, { merge: true });
  if (!value && (await ref.get()).get("unsafe") !== true) await db.doc(`locations/${uid}`).delete();
  return { ok: true };
});

/**
 * Safe again. The password is checked on the phone (against a locally saved hash, so it also
 * works offline). This function only updates the status and restores the old Track me setting.
 */
export const setSafe = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  const restore = (await db.doc(`secrets/${uid}`).get()).get("prevTrackMe") !== false;
  const ref = db.doc(`users/${uid}`);
  await ref.set({ unsafe: false, trackMe: restore }, { merge: true });
  if (!restore) await db.doc(`locations/${uid}`).delete();

  const nickname = String((await ref.get()).get("nickname") ?? "Someone");
  const others = await activeConnections(uid);
  await Promise.all(others.map((o) => notify(o, { type: "safe", fromUid: uid, nickname })));
  return { ok: true };
});
