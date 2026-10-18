import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { db, notify, pairIdOf, activeConnections } from "./admin";

const REGION = "asia-south1";
const MAX_CONNECTIONS = 10;
const MAX_FAILS = 5;
const BASE_LOCK_MS = 15 * 60 * 1000;
const MAX_LOCK_MS = 24 * 60 * 60 * 1000;
const NICKNAME_MAX = 8;

function requireUid(request: CallableRequest): string {
  if (!request.auth) throw new HttpsError("unauthenticated", "Please log in");
  return request.auth.uid;
}

/** Email in lower case, or a phone number like +8801712345678 (the app formats it first). */
function normalizeIdentifier(input: unknown): string {
  if (typeof input !== "string") throw new HttpsError("invalid-argument", "bad identifier");
  const s = input.trim().toLowerCase();
  if (s.includes("@")) return s;
  const phone = s.replace(/[^\d+]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new HttpsError("invalid-argument", "bad identifier");
  return phone;
}

function hashCode(code: string, salt: Buffer): Buffer {
  return scryptSync(code, salt, 32);
}

/** Cuts to NICKNAME_MAX visible characters, so a Bangla conjunct counts as one. */
function limitVisible(text: string, max: number): string {
  const segments = [...new Intl.Segmenter().segment(text.trim())].map((s) => s.segment);
  return segments.slice(0, max).join("");
}

export const setNickname = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  const raw = (request.data as { nickname?: unknown })?.nickname;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new HttpsError("invalid-argument", "Nickname is required");
  }
  const ref = db.doc(`users/${uid}`);
  const exists = (await ref.get()).exists;
  await ref.set(
    { nickname: limitVisible(raw, NICKNAME_MAX), ...(exists ? {} : { trackMe: true, unsafe: false }) },
    { merge: true }
  );
  return { ok: true };
});

/** Sets or changes the 6 digit pair code, and links the verified email / phone to this account. */
export const setPairCode = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  const code = String((request.data as { code?: unknown })?.code ?? "");
  if (!/^\d{6}$/.test(code)) throw new HttpsError("invalid-argument", "Pair code must be 6 digits");

  const salt = randomBytes(16);
  await db.doc(`secrets/${uid}`).set(
    { pairCodeHash: hashCode(code, salt).toString("hex"), pairCodeSalt: salt.toString("hex") },
    { merge: true }
  );

  const token = request.auth!.token;
  const ids: string[] = [];
  if (token.email && token.email_verified) ids.push(token.email.toLowerCase());
  if (token.phone_number) ids.push(token.phone_number);
  const batch = db.batch();
  for (const id of ids) batch.set(db.doc(`identifiers/${id}`), { uid });
  await batch.commit();
  return { ok: true };
});

async function registerFailure(
  ref: FirebaseFirestore.DocumentReference,
  prev: FirebaseFirestore.DocumentData | undefined
): Promise<void> {
  const fails = ((prev?.fails as number | undefined) ?? 0) + 1;
  const level = (prev?.level as number | undefined) ?? 0;
  if (fails >= MAX_FAILS) {
    const lock = Math.min(BASE_LOCK_MS * 2 ** level, MAX_LOCK_MS);
    await ref.set({ fails: 0, level: level + 1, lockUntil: Date.now() + lock });
  } else {
    await ref.set({ fails, level, lockUntil: 0 });
  }
}

/**
 * Asks to connect with someone, using their email or phone and their pair code.
 * The answer is always the same, so nobody can find out whether an account exists.
 */
export const requestConnection = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  const { identifier, code } = (request.data ?? {}) as { identifier?: unknown; code?: unknown };
  const id = normalizeIdentifier(identifier);
  const codeText = String(code ?? "");
  const generic = { status: "sent_if_details_are_correct" };

  const attemptRef = db.doc(`attempts/${uid}_${createHash("sha256").update(id).digest("hex")}`);
  const attempt = await attemptRef.get();
  if (((attempt.get("lockUntil") as number | undefined) ?? 0) > Date.now()) {
    throw new HttpsError("resource-exhausted", "Too many wrong tries. Please try again later.");
  }

  const targetUid = (await db.doc(`identifiers/${id}`).get()).get("uid") as string | undefined;
  let ok = false;
  if (targetUid && targetUid !== uid && /^\d{6}$/.test(codeText)) {
    const secrets = await db.doc(`secrets/${targetUid}`).get();
    const hash = secrets.get("pairCodeHash") as string | undefined;
    const salt = secrets.get("pairCodeSalt") as string | undefined;
    if (hash && salt) {
      ok = timingSafeEqual(hashCode(codeText, Buffer.from(salt, "hex")), Buffer.from(hash, "hex"));
    }
  }
  if (!ok || !targetUid) {
    await registerFailure(attemptRef, attempt.data());
    return generic;
  }
  await attemptRef.delete();

  const [mine, theirs] = await Promise.all([activeConnections(uid), activeConnections(targetUid)]);
  const ref = db.doc(`connections/${pairIdOf(uid, targetUid)}`);
  if ((await ref.get()).exists || mine.length >= MAX_CONNECTIONS || theirs.length >= MAX_CONNECTIONS) {
    return generic;
  }
  await ref.set({
    members: [uid, targetUid],
    requester: uid,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  });
  const nickname = String((await db.doc(`users/${uid}`).get()).get("nickname") ?? "Someone");
  await notify(targetUid, { type: "connection_request", fromUid: uid, nickname });
  return generic;
});

/** The person who received a request accepts or declines it. */
export const respondToRequest = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  const { fromUid, accept } = (request.data ?? {}) as { fromUid?: unknown; accept?: unknown };
  if (typeof fromUid !== "string" || typeof accept !== "boolean") {
    throw new HttpsError("invalid-argument", "bad request");
  }
  const ref = db.doc(`connections/${pairIdOf(uid, fromUid)}`);
  const snap = await ref.get();
  if (
    !snap.exists ||
    snap.get("status") !== "pending" ||
    snap.get("requester") !== fromUid ||
    !(snap.get("members") as string[]).includes(uid)
  ) {
    throw new HttpsError("not-found", "No such request");
  }
  if (!accept) {
    await ref.delete();
    return { status: "declined" };
  }
  const [mine, theirs] = await Promise.all([activeConnections(uid), activeConnections(fromUid)]);
  if (mine.length >= MAX_CONNECTIONS) {
    throw new HttpsError("failed-precondition", "Connection limit reached");
  }
  if (theirs.length >= MAX_CONNECTIONS) {
    await ref.delete();
    throw new HttpsError("failed-precondition", "The other person reached the limit");
  }
  await ref.update({ status: "active", acceptedAt: FieldValue.serverTimestamp() });
  await notify(fromUid, { type: "connection_accepted", fromUid: uid });
  return { status: "connected" };
});

/** Either side can delete a connection at any time. */
export const removeConnection = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  const otherUid = (request.data as { otherUid?: unknown })?.otherUid;
  if (typeof otherUid !== "string") throw new HttpsError("invalid-argument", "bad request");
  await db.doc(`connections/${pairIdOf(uid, otherUid)}`).delete();
  return { ok: true };
});

export const registerFcmToken = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  const token = (request.data as { token?: unknown })?.token;
  if (typeof token !== "string" || token.length < 20) throw new HttpsError("invalid-argument", "bad token");
  await db.doc(`secrets/${uid}`).set({ fcmToken: token }, { merge: true });
  return { ok: true };
});
