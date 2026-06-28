import { Match, Show, Switch } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { css } from "styled-system/css";

import { useClientLifecycle } from "@revolt/client";
import { TransitionType } from "@revolt/client/Controller";
import { CONFIGURATION } from "@revolt/common";
import { Navigate } from "@revolt/routing";
import { Button, Column } from "@revolt/ui";

import { useState } from "@revolt/state";
import logo from "../../../../public/assets/web/logo.png";
import discord from "./discord.svg";

/**
 * Flow for logging into an account
 */
export default function FlowHome() {
  const state = useState();
  const { lifecycle, isLoggedIn, isError } = useClientLifecycle();

  /**
   * Start the Authentik (Discord) single sign-on flow. delta runs the OIDC
   * authorization-code exchange server-side and returns to /login/oidc.
   */
  function continueWithDiscord() {
    window.location.href = `${CONFIGURATION.DEFAULT_API_URL}/auth/oidc/login`;
  }

  return (
    <Switch
      fallback={
        <>
          <Show when={isLoggedIn()}>
            <Navigate href={state.layout.popNextPath() ?? "/app"} />
          </Show>

          <Column gap="xl">
            <img
              src={logo}
              alt="Cooey Club"
              class={css({
                width: "55%",
                margin: "auto",
                borderRadius: "24px",
              })}
            />

            <Column>
              <Button size="md" bg="#5865F2" onPress={continueWithDiscord}>
                <span
                  style={{
                    display: "flex",
                    "align-items": "center",
                    "justify-content": "center",
                    gap: "10px",
                    color: "#fff",
                  }}
                >
                  <img src={discord} alt="" style={{ height: "20px" }} />
                  <Trans>Continue with Discord</Trans>
                </span>
              </Button>
            </Column>

            <Column>
              <b
                style={{
                  "font-weight": 800,
                  "font-size": "1.4em",
                  display: "flex",
                  "flex-direction": "column",
                  "align-items": "center",
                  "text-align": "center",
                }}
              >
                <span>
                  <Trans>
                    Find your com
                    <wbr />
                    munity,
                    <br />
                    connect with the world.
                  </Trans>
                </span>
              </b>
              <span style={{ "text-align": "center", opacity: "0.5" }}>
                <Trans>
                  Cooey Club is one of the best ways to stay connected with your
                  friends and community, anywhere, anytime.
                </Trans>
              </span>
            </Column>

            <Column>
              <a href="/login/auth">
                <Column>
                  <Button variant="tonal">
                    <Trans>Log in with email</Trans>
                  </Button>
                </Column>
              </a>
              <a href="/login/create">
                <Column>
                  <Button variant="text">
                    <Trans>Sign up with email</Trans>
                  </Button>
                </Column>
              </a>
            </Column>
          </Column>
        </>
      }
    >
      <Match when={isError()}>
        <Switch fallback={"an unknown error occurred"}>
          <Match when={lifecycle.permanentError === "InvalidSession"}>
            <h1>
              <Trans>You were logged out!</Trans>
            </h1>
          </Match>
        </Switch>

        <Button
          variant="filled"
          onPress={() =>
            lifecycle.transition({
              type: TransitionType.Dismiss,
            })
          }
        >
          <Trans>OK</Trans>
        </Button>
      </Match>
    </Switch>
  );
}
