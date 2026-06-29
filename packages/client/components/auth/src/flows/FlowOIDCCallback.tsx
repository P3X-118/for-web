import { Match, Switch, createSignal, onMount } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";

import { CONFIGURATION } from "@revolt/common";
import { Button, CircularProgress } from "@revolt/ui";

import { useState } from "@revolt/state";
import { FlowTitle } from "./Flow";

/**
 * Flow for completing an Authentik (OIDC) login.
 *
 * The delta backend runs the OIDC authorization-code flow server-side and
 * redirects here with the freshly-minted authifier session in the URL
 * **fragment** (never the query string):
 *
 *   /login/oidc#token=<token>&user_id=<id>&session_id=<id>   (success)
 *   /login/oidc#error=<reason>                               (failure)
 *
 * We adopt the session and full-reload into the normal login flow, which logs
 * in with the stored session and onboards first-time SSO users.
 */
/**
 * sessionStorage key carrying the IdP-suggested onboarding username across the
 * post-callback reload (read + cleared by FlowLogin's onboarding step).
 */
export const OIDC_USERNAME_KEY = "oidc:suggestedUsername";

/** Reduce an IdP display name to something usable as a default username. */
function sanitizeUsername(name: string): string {
  return (name ?? "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_.-]/g, "")
    .slice(0, 32);
}

export default function FlowOIDCCallback() {
  const state = useState();
  const [error, setError] = createSignal<string | undefined>();

  /**
   * The delta OIDC callback stored the IdP display name as the session name;
   * stash a sanitized copy (best-effort) so onboarding can prefill the username.
   */
  async function stashSuggestedUsername(token: string, sessionId: string) {
    try {
      const res = await fetch(
        `${CONFIGURATION.DEFAULT_API_URL}/auth/session/all`,
        { headers: { "x-session-token": token } },
      );
      if (!res.ok) return;
      const sessions: { _id: string; name?: string }[] = await res.json();
      const current =
        sessions.find((s) => s._id === sessionId) ??
        sessions[sessions.length - 1];
      const suggested = sanitizeUsername(current?.name ?? "");
      if (suggested.length >= 2) {
        sessionStorage.setItem(OIDC_USERNAME_KEY, suggested);
      }
    } catch {
      // best-effort; onboarding just falls back to an empty field
    }
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    const err = params.get("error");
    if (err) {
      setError(err);
      return;
    }

    const token = params.get("token");
    const userId = params.get("user_id");
    const sessionId = params.get("session_id");

    if (token && userId && sessionId) {
      state.auth.setSession({
        _id: sessionId,
        token,
        userId,
        valid: true,
      });

      // Prefetch the IdP-suggested username (best-effort), then full reload so
      // the session material is dropped from the URL/history and the client
      // lifecycle picks up the stored session (FlowLogin onboards first-time
      // SSO users / redirects existing ones to the app).
      stashSuggestedUsername(token, sessionId).finally(() => {
        window.location.replace("/login/auth");
      });
    } else {
      setError("invalid_callback");
    }
  });

  return (
    <Switch
      fallback={
        <>
          <FlowTitle>
            <Trans>Signing you in…</Trans>
          </FlowTitle>
          <CircularProgress />
        </>
      }
    >
      <Match when={error()}>
        <FlowTitle>
          <Trans>Sign-in failed</Trans>
        </FlowTitle>
        <a href="/login/auth">
          <Button variant="text">
            <Trans>Go back to login</Trans>
          </Button>
        </a>
      </Match>
    </Switch>
  );
}
