import { Match, Switch, createSignal, onMount } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";

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
export default function FlowOIDCCallback() {
  const state = useState();
  const [error, setError] = createSignal<string | undefined>();

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

      // Full reload so the session material is dropped from the URL/history and
      // the client lifecycle picks up the stored session (FlowLogin onboards
      // first-time SSO users / redirects existing ones to the app).
      window.location.replace("/login/auth");
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
