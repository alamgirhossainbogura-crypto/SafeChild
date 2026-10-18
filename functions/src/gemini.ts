import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// Change the model here only. The app never needs an update for this.
const MODEL = "gemini-3.5-flash";

const MAX_MESSAGES = 20;
const MAX_TEXT_LENGTH = 1000;

const SYSTEM_INSTRUCTION = `
You are "SafeChild First Aid AI", a helper inside a child and family safety app.
You give general first aid information only. You are not a doctor and you never diagnose.

Language: reply in the language the user writes in. It can be English, Bangla (বাংলা) or
Banglish (Bangla written in English letters). Match the user's style. Use simple words.
The user may be a child, so be calm and clear, and suggest telling a trusted adult.

Style: short answers. Numbered steps, at most 6 steps. Give the immediate safe steps first.
Ask at most one short question, and only if it is really needed (for example age or what happened).

Emergencies: if the user describes any of these, start your reply with the exact text [URGENT]
and tell them to call their local emergency number or get an adult right now, before anything else:
unconscious or not responding, not breathing or struggling to breathe, choking, severe bleeding,
chest pain, seizure, poisoning or swallowing something harmful, severe burns, serious head injury,
signs of stroke, severe allergic reaction, drowning, electric shock.

Safety rules:
- Never give medicine names with doses. Say to ask a doctor or pharmacist.
- Never say you are certain. Say when a doctor must see the person.
- If someone talks about hurting themselves or someone else, respond with care, start with [URGENT],
  and urge them to contact emergency services or a trusted adult immediately.
- Do not ask for names, addresses or phone numbers. If the user shares them, do not repeat them.
- If the question is not about first aid or safety, politely say you can only help with first aid and safety.
`;

// Words that also mark a message as urgent, in case the model forgets the [URGENT] marker.
// This is a small starting list. Add more English, Bangla and Banglish words after testing.
const URGENT_WORDS = [
  "unconscious", "not breathing", "can't breathe", "cannot breathe", "severe bleeding",
  "choking", "poison", "seizure", "drowning", "heart attack",
  "অজ্ঞান", "শ্বাস নিচ্ছে না", "শ্বাস নিতে পারছি না", "প্রচুর রক্ত", "বিষ খেয়েছে",
  "ogyan", "shash nicche na", "shash nite parchi na", "onek rokto",
];

type ChatMessage = { role: "user" | "model"; text: string };

function containsUrgentWord(text: string): boolean {
  const t = text.toLowerCase();
  return URGENT_WORDS.some((w) => t.includes(w.toLowerCase()));
}

function readMessages(data: unknown): ChatMessage[] {
  const raw = (data as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) {
    throw new HttpsError("invalid-argument", "messages must be a list of 1 to 20 items");
  }
  return raw.map((m) => {
    const role = (m as ChatMessage)?.role;
    const text = (m as ChatMessage)?.text;
    if ((role !== "user" && role !== "model") || typeof text !== "string" || text.length === 0) {
      throw new HttpsError("invalid-argument", "bad message");
    }
    return { role, text: text.slice(0, MAX_TEXT_LENGTH) };
  });
}

export const firstAidChat = onCall(
  { secrets: [GEMINI_API_KEY], region: "asia-south1", maxInstances: 10 },
  async (request) => {
    // Turn this on once accounts exist, so strangers cannot use your quota.
    // if (!request.auth) throw new HttpsError("unauthenticated", "Please log in");

    const messages = readMessages(request.data);
    if (messages[messages.length - 1].role !== "user") {
      throw new HttpsError("invalid-argument", "last message must be from the user");
    }

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
        config: { systemInstruction: SYSTEM_INSTRUCTION, maxOutputTokens: 700, temperature: 0.3 },
      });

      let reply = (response.text ?? "").trim();
      if (!reply) throw new Error("empty reply");

      const urgentByModel = reply.startsWith("[URGENT]");
      reply = reply.replace(/^\[URGENT\]\s*/, "");
      const urgent =
        urgentByModel ||
        containsUrgentWord(messages[messages.length - 1].text) ||
        containsUrgentWord(reply);

      return { reply, urgent };
    } catch (err) {
      console.error("firstAidChat failed", err);
      throw new HttpsError("internal", "The assistant is not available right now");
    }
  }
);
