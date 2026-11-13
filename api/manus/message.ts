import { errorResponse, json, methodNotAllowed, readJson } from "../_lib/http.js";
import { sendTaskMessage } from "../_lib/manus.js";
import { buildFollowUpPrompt, RESUME_MESSAGE } from "../_lib/prompt.js";
import { IdempotencyCache, rateLimit } from "../_lib/rateLimit.js";
import { verifySession } from "../_lib/session.js";
import { parseChatMessage, parseId } from "../_lib/validate.js";

const deliveries = new IdempotencyCache<true>(10 * 60 * 1000);

export async function POST(request: Request) {
  try {
    const body = await readJson(request, 6_000);
    const userId = parseId(body.userId, "User");
    const clientMessageId = parseId(body.clientMessageId, "Message");
    const claims = await verifySession(typeof body.sessionToken === "string" ? body.sessionToken : null, userId);
    const resume = body.kind === "resume";
    const text = resume ? RESUME_MESSAGE : buildFollowUpPrompt(parseChatMessage(body.message));

    // The same message id is only ever delivered to Manus once, so a retry after a timeout cannot duplicate it.
    await deliveries.run(`${claims.sid}:${clientMessageId}`, async () => {
      rateLimit(`message:global`, 8, 60_000, "The assistant is handling many conversations right now. Please try again in a minute.");
      rateLimit(`message:session:${claims.sid}`, 12, 10 * 60_000, "You are sending messages quickly. Please wait a moment before the next one.");
      rateLimit(`message:user:${userId}`, 40, 60 * 60_000);
      await sendTaskMessage(claims.tid, text);
      return true as const;
    });

    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export function GET() {
  return methodNotAllowed("POST");
}
