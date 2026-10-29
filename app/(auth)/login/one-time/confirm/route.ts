import { NextResponse, type NextRequest } from "next/server";

import { container } from "@/src/infrastructure/di/container";
import {
  createSession,
  destroySession,
  getCurrentSessionToken,
  rememberAccount,
  stopImpersonation,
} from "@/src/infrastructure/auth/session";
import {
  ConsumeOneTimeLoginLinkUseCase,
  OneTimeLoginError,
} from "@/src/application/use-cases/auth/OneTimeLoginUseCases";
import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import { isAcceptableConfirmOrigin } from "@/src/domain/services/one-time-login";
import { ROLE_HOME } from "@/src/domain/types/roles";
import { getClientIp, getUserAgent } from "@/src/presentation/lib/request-ip";

export const dynamic = "force-dynamic";

const ATTEMPT_LIMIT = 10;
const ATTEMPT_WINDOW_MS = 10 * 60_000;

/**
 * The ONLY place a one-time login link is consumed: an explicit POST from the
 * chooser form. A plain route handler (not a Server Action) so it works as a
 * native form POST before hydration / without JS and accepts `Origin: null`
 * (the page is `Referrer-Policy: no-referrer`), which the framework's Server
 * Action CSRF check rejected with a bare 403 — the "dead link" in in-app browsers.
 */
export async function POST(req: NextRequest) {
  const back = (params: Record<string, string>) => {
    const u = new URL("/login/one-time", req.url);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return NextResponse.redirect(u, 303);
  };

  if (
    !isAcceptableConfirmOrigin({
      origin: req.headers.get("origin"),
      host: req.headers.get("host"),
      secFetchSite: req.headers.get("sec-fetch-site"),
    })
  ) {
    return back({ e: "forbidden" });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return back({ e: "not_found" });
  }
  const token = String(form.get("t") ?? "");
  const userId = String(form.get("userId") ?? "");

  const ip = await getClientIp();
  const rl = await container.rateLimitRepository.hit(
    `otl:ip:${ip}`,
    ATTEMPT_LIMIT,
    ATTEMPT_WINDOW_MS,
  );
  if (!rl.allowed) return back({ t: token, e: "rate_limited" });

  let home: string;
  try {
    const { user, link } = await new ConsumeOneTimeLoginLinkUseCase(
      container.adminLoginLinkRepository,
      container.shopRepository,
      container.userRepository,
    ).execute(token, userId);
    await container.auditLogger.record({
      actorUserId: user.id,
      actorRole: user.role,
      action: AUDIT_ACTIONS.oneTimeLoginLinkUsed,
      shopId: link.shopId,
      targetType: "admin_login_link",
      targetId: link.id,
      ip,
      userAgent: await getUserAgent(),
      metadata: {
        kind: link.kind,
        issuedBy: link.createdBy,
        chosenUserId: user.id,
        role: user.role,
      },
    });
    if (await getCurrentSessionToken()) await destroySession();
    await stopImpersonation();
    await rememberAccount({ email: user.email, role: user.role });
    await createSession(user.id);
    home = ROLE_HOME[user.role];
  } catch (e) {
    if (e instanceof OneTimeLoginError) {
      // Dead links: drop the token from the URL. Wrong account: let them retry.
      return e.reason === "wrong_account"
        ? back({ t: token, e: e.reason })
        : back({ e: e.reason });
    }
    throw e;
  }
  return NextResponse.redirect(new URL(home, req.url), 303);
}

/** Never consume on GET/HEAD (prefetchers, previews): bounce to the page. */
export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/login/one-time", req.url), 303);
}
