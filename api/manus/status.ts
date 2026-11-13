import { errorResponse, json, methodNotAllowed } from "../_lib/http.js";
import { getTaskDetail, listTaskMessages } from "../_lib/manus.js";
import { rateLimit } from "../_lib/rateLimit.js";
import { verifySession } from "../_lib/session.js";
import { buildSnapshot } from "../_lib/transcript.js";
import { parseId } from "../_lib/validate.js";

export async function GET(request: Request) {
  try {
    const userId = parseId(request.headers.get("x-user-id"), "User");
    const claims = await verifySession(request.headers.get("x-session-token"), userId);
    rateLimit(`status:session:${claims.sid}`, 40, 60_000, "Checking too often. Please wait a few seconds.");

    const [detail, events] = await Promise.all([getTaskDetail(claims.tid), listTaskMessages(claims.tid)]);
    const snapshot = buildSnapshot(events, detail.status);
    return json({ ok: true, sessionId: claims.sid, ...snapshot });
  } catch (error) {
    return errorResponse(error);
  }
}

export function POST() {
  return methodNotAllowed("GET");
}
