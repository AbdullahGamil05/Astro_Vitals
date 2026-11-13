import { errorResponse, clientIp, json, methodNotAllowed, readJson } from "../_lib/http.js";
import { createTask } from "../_lib/manus.js";
import { buildAssessmentPrompt } from "../_lib/prompt.js";
import { IdempotencyCache, rateLimit } from "../_lib/rateLimit.js";
import { signSession } from "../_lib/session.js";
import { parseAnswers, parseId } from "../_lib/validate.js";

interface Created {
  sessionToken: string;
  sessionId: string;
  expiresAt: number;
}

// A retried submission (same user + submission id) returns the task already created instead of making a second one.
const submissions = new IdempotencyCache<Created>(30 * 60 * 1000);

export async function POST(request: Request) {
  try {
    const body = await readJson(request, 4_000);
    const userId = parseId(body.userId, "User");
    const submissionId = parseId(body.submissionId, "Submission");
    const answers = parseAnswers(body.answers);

    const created = await submissions.run(`${userId}:${submissionId}`, async () => {
      rateLimit(`create:global`, 8, 60_000, "Many check-ins are being analysed right now. Please try again in a minute.");
      rateLimit(`create:ip:${clientIp(request)}`, 20, 60 * 60_000);
      rateLimit(`create:user:${userId}`, 8, 60 * 60_000, "You have submitted several check-ins recently. Please try again later.");

      const { taskId } = await createTask(buildAssessmentPrompt(answers, new Date()));
      const sessionId = crypto.randomUUID();
      const { token, claims } = await signSession({ sid: sessionId, tid: taskId, uid: userId });
      return { sessionToken: token, sessionId, expiresAt: claims.exp };
    });

    return json({ ok: true, ...created }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export function GET() {
  return methodNotAllowed("POST");
}
