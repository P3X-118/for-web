import { For, Match, Show, Switch, createResource } from "solid-js";

import { styled } from "styled-system/jsx";

import {
  BlueskyPost,
  blueskyProfileUrl,
  brokerAtprotoSession,
  fetchTimeline,
  isValidHandle,
} from "@revolt/common";
import { useState } from "@revolt/state";
import { Text } from "@revolt/ui";

/**
 * Outcome of loading the in-chat Bluesky feed.
 */
type FeedResult =
  | { status: "unauthed" }
  | { status: "nolink" }
  | { status: "error" }
  | { status: "ok"; handle: string; did: string; posts: BlueskyPost[] };

/**
 * Right-hand "personalized Bluesky feed" panel.
 *
 * Brokers the chat user's atproto session through delta, then reads their home
 * timeline directly from their cooey.club PDS. A scaffold: read-only for now,
 * the natural place to grow posting / notifications later.
 */
export function BlueskySidebar() {
  const state = useState();

  const [feed, { refetch }] = createResource<FeedResult>(async () => {
    const token = state.auth.getSession()?.token;
    if (!token) return { status: "unauthed" };

    const session = await brokerAtprotoSession(token);
    if (!session) return { status: "nolink" };

    try {
      const posts = await fetchTimeline(session, 30);
      return { status: "ok", handle: session.handle, did: session.did, posts };
    } catch {
      return { status: "error" };
    }
  });

  /** Narrow to the success case for the template. */
  const ok = () => {
    const f = feed();
    return f && f.status === "ok" ? f : undefined;
  };

  return (
    <Container>
      <TitleRow>
        <Text class="label" size="large">
          Bluesky
        </Text>
        <Show when={ok()}>
          {(result) => (
            <ProfileLink
              href={blueskyProfileUrl(result().did)}
              target="_blank"
              rel="noreferrer"
            >
              @{result().handle}
            </ProfileLink>
          )}
        </Show>
      </TitleRow>

      <Switch>
        <Match when={feed.loading}>
          <Hint>
            <Text>Loading your feed…</Text>
          </Hint>
        </Match>
        <Match
          when={
            feed()?.status === "unauthed" || feed()?.status === "error"
          }
        >
          <Hint>
            <Text>Couldn't load your Bluesky feed.</Text>
            <Action onClick={() => refetch()}>Retry</Action>
          </Hint>
        </Match>
        <Match when={feed()?.status === "nolink"}>
          <Hint>
            <Text>You don't have a Cooey Bluesky yet.</Text>
            <ProfileLink
              href="https://bsky.cooey.club"
              target="_blank"
              rel="noreferrer"
            >
              Set up your Bluesky
            </ProfileLink>
          </Hint>
        </Match>
        <Match when={ok()}>
          {(result) => (
            <Show
              when={result().posts.length}
              fallback={
                <Hint>
                  <Text>Your timeline is empty.</Text>
                </Hint>
              }
            >
              <For each={result().posts}>
                {(post) => <PostCard post={post} />}
              </For>
            </Show>
          )}
        </Match>
      </Switch>
    </Container>
  );
}

/**
 * A single timeline post.
 */
function PostCard(props: { post: BlueskyPost }) {
  return (
    <Card
      href={
        props.post.did
          ? blueskyProfileUrl(props.post.did)
          : isValidHandle(props.post.handle)
            ? blueskyProfileUrl(props.post.handle)
            : undefined
      }
      target="_blank"
      rel="noreferrer"
    >
      <CardHeader>
        <Show when={props.post.avatar} fallback={<AvatarFallback />}>
          <Avatar src={props.post.avatar} alt="" referrerpolicy="no-referrer" />
        </Show>
        <Names>
          <Show when={props.post.displayName}>
            <DisplayName>{props.post.displayName}</DisplayName>
          </Show>
          <Handle>@{props.post.handle}</Handle>
        </Names>
      </CardHeader>
      <PostText>{props.post.text}</PostText>
    </Card>
  );
}

const Container = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-sm)",
    padding: "var(--gap-md)",
    width: "360px",
    color: "var(--md-sys-color-on-surface)",
  },
});

const TitleRow = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "var(--gap-sm)",
    paddingBottom: "var(--gap-sm)",
  },
});

const ProfileLink = styled("a", {
  base: {
    fontSize: "0.8125rem",
    color: "var(--md-sys-color-primary)",
    textDecoration: "none",
    _hover: { textDecoration: "underline" },
  },
});

const Hint = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "var(--gap-sm)",
    padding: "var(--gap-md)",
    color: "var(--md-sys-color-on-surface-variant)",
  },
});

const Action = styled("button", {
  base: {
    cursor: "pointer",
    border: "none",
    borderRadius: "var(--borderRadius-full)",
    padding: "6px 14px",
    fontSize: "0.8125rem",
    color: "var(--md-sys-color-on-primary)",
    background: "var(--md-sys-color-primary)",
  },
});

const Card = styled("a", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-sm)",
    padding: "var(--gap-md)",
    borderRadius: "var(--borderRadius-lg)",
    background: "var(--md-sys-color-surface-container-high)",
    color: "inherit",
    textDecoration: "none",
    _hover: { background: "var(--md-sys-color-surface-container-highest)" },
  },
});

const CardHeader = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "var(--gap-sm)",
    minWidth: 0,
  },
});

const Avatar = styled("img", {
  base: {
    width: "32px",
    height: "32px",
    borderRadius: "var(--borderRadius-full)",
    objectFit: "cover",
    flexShrink: 0,
  },
});

const AvatarFallback = styled("div", {
  base: {
    width: "32px",
    height: "32px",
    borderRadius: "var(--borderRadius-full)",
    background: "var(--md-sys-color-surface-variant)",
    flexShrink: 0,
  },
});

const Names = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    lineHeight: 1.2,
  },
});

const DisplayName = styled("span", {
  base: {
    fontWeight: 600,
    fontSize: "0.875rem",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});

const Handle = styled("span", {
  base: {
    fontSize: "0.75rem",
    color: "var(--md-sys-color-on-surface-variant)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});

const PostText = styled("div", {
  base: {
    fontSize: "0.875rem",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
});
