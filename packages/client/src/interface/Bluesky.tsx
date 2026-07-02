import { For, Match, Show, Switch, createResource } from "solid-js";

import { styled } from "styled-system/jsx";

import {
  BlueskyPost,
  blueskyProfileUrl,
  brokerAtprotoSession,
  fetchTimeline,
  getProfile,
} from "@revolt/common";
import { useState } from "@revolt/state";
import { Header, Text, main } from "@revolt/ui";
import { Symbol } from "@revolt/ui/components/utils/Symbol";

import { HeaderIcon } from "./common/CommonHeader";

/**
 * Result of loading the signed-in user's Bluesky.
 */
type BlueskyData =
  | { status: "unauthed" }
  | { status: "nolink" }
  | {
      status: "ok";
      handle: string;
      displayName?: string;
      avatar?: string;
      description?: string;
      counts: { posts?: number; follows?: number; followers?: number };
      posts: BlueskyPost[] | null;
    };

/**
 * Full-page "your Bluesky" view.
 *
 * The user is already authenticated with Cooey SSO, so we broker their atproto
 * session through delta and render their own Bluesky — profile + home timeline —
 * signed in, without a second login. Read-only for now; "Open full Bluesky"
 * links out to the complete web client.
 */
export function Bluesky() {
  const state = useState();

  const [data] = createResource<BlueskyData>(async () => {
    const token = state.auth.getSession()?.token;
    if (!token) return { status: "unauthed" };

    const session = await brokerAtprotoSession(token);
    if (!session) return { status: "nolink" };

    const [profile, posts] = await Promise.all([
      getProfile(session).catch(() => null),
      fetchTimeline(session, 40).catch(() => null),
    ]);

    return {
      status: "ok",
      handle: profile?.handle ?? session.handle,
      displayName: profile?.displayName,
      avatar: profile?.avatar,
      description: profile?.description,
      counts: {
        posts: profile?.postsCount,
        follows: profile?.followsCount,
        followers: profile?.followersCount,
      },
      posts,
    };
  });

  const ok = () => {
    const d = data();
    return d && d.status === "ok" ? d : undefined;
  };

  return (
    <Base>
      <Header placement="primary">
        <HeaderIcon>
          <Symbol>cloud</Symbol>
        </HeaderIcon>
        Bluesky
      </Header>
      <Scroll class={main()}>
        <Content>
          <Switch>
            <Match when={data.loading}>
              <Hint>
                <Text>Signing in to your Bluesky…</Text>
              </Hint>
            </Match>
            <Match when={data()?.status === "unauthed"}>
              <Hint>
                <Text>You need to be signed in to Cooey.</Text>
              </Hint>
            </Match>
            <Match when={data()?.status === "nolink"}>
              <Hint>
                <Text>You don't have a Cooey Bluesky yet.</Text>
                <ExternalLink
                  href="https://bsky.cooey.club"
                  target="_blank"
                  rel="noreferrer"
                >
                  Set up your Bluesky →
                </ExternalLink>
              </Hint>
            </Match>
            <Match when={ok()}>
              {(d) => (
                <>
                  <Profile>
                    <Show
                      when={d().avatar}
                      fallback={<AvatarLarge as="div" />}
                    >
                      <AvatarLarge
                        src={d().avatar}
                        alt=""
                        referrerpolicy="no-referrer"
                      />
                    </Show>
                    <ProfileMeta>
                      <Show when={d().displayName}>
                        <ProfileName>{d().displayName}</ProfileName>
                      </Show>
                      <ProfileHandle>@{d().handle}</ProfileHandle>
                      <Counts>
                        <span>
                          <b>{d().counts.posts ?? 0}</b> posts
                        </span>
                        <span>
                          <b>{d().counts.follows ?? 0}</b> following
                        </span>
                        <span>
                          <b>{d().counts.followers ?? 0}</b> followers
                        </span>
                      </Counts>
                    </ProfileMeta>
                    <ExternalLink
                      href={blueskyProfileUrl(d().handle)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open full Bluesky ↗
                    </ExternalLink>
                  </Profile>

                  <FeedTitle>
                    <Text class="label" size="large">
                      Home timeline
                    </Text>
                  </FeedTitle>

                  <Switch>
                    <Match when={d().posts === null}>
                      <Hint>
                        <Text>Couldn't load your timeline right now.</Text>
                      </Hint>
                    </Match>
                    <Match when={(d().posts?.length ?? 0) === 0}>
                      <Hint>
                        <Text>
                          Your timeline is empty. Follow people on Bluesky to
                          see their posts here.
                        </Text>
                      </Hint>
                    </Match>
                    <Match when={d().posts}>
                      <For each={d().posts!}>
                        {(post) => <PostCard post={post} />}
                      </For>
                    </Match>
                  </Switch>
                </>
              )}
            </Match>
          </Switch>
        </Content>
      </Scroll>
    </Base>
  );
}

/**
 * A single timeline post.
 */
function PostCard(props: { post: BlueskyPost }) {
  return (
    <Card
      href={
        props.post.handle ? blueskyProfileUrl(props.post.handle) : undefined
      }
      target="_blank"
      rel="noreferrer"
    >
      <CardHeader>
        <Show when={props.post.avatar} fallback={<Avatar as="div" />}>
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

const Base = styled("div", {
  base: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    color: "var(--md-sys-color-on-surface)",
  },
});

const Scroll = styled("div", {
  base: {
    overflowY: "auto",
  },
});

const Content = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-md)",
    width: "100%",
    maxWidth: "640px",
    margin: "0 auto",
    padding: "var(--gap-lg)",
  },
});

const Profile = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "var(--gap-md)",
    padding: "var(--gap-lg)",
    borderRadius: "var(--borderRadius-lg)",
    background: "var(--md-sys-color-surface-container-high)",
    flexWrap: "wrap",
  },
});

const AvatarLarge = styled("img", {
  base: {
    width: "64px",
    height: "64px",
    borderRadius: "var(--borderRadius-full)",
    objectFit: "cover",
    flexShrink: 0,
    background: "var(--md-sys-color-surface-variant)",
  },
});

const ProfileMeta = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
    flexGrow: 1,
  },
});

const ProfileName = styled("span", {
  base: { fontWeight: 700, fontSize: "1.125rem" },
});

const ProfileHandle = styled("span", {
  base: {
    fontSize: "0.875rem",
    color: "var(--md-sys-color-on-surface-variant)",
  },
});

const Counts = styled("div", {
  base: {
    display: "flex",
    gap: "var(--gap-md)",
    marginTop: "6px",
    fontSize: "0.8125rem",
    color: "var(--md-sys-color-on-surface-variant)",
    flexWrap: "wrap",
  },
});

const FeedTitle = styled("div", {
  base: { paddingInline: "4px", paddingTop: "var(--gap-sm)" },
});

const ExternalLink = styled("a", {
  base: {
    fontSize: "0.8125rem",
    color: "var(--md-sys-color-primary)",
    textDecoration: "none",
    whiteSpace: "nowrap",
    _hover: { textDecoration: "underline" },
  },
});

const Hint = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "var(--gap-sm)",
    padding: "var(--gap-lg)",
    color: "var(--md-sys-color-on-surface-variant)",
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
    width: "36px",
    height: "36px",
    borderRadius: "var(--borderRadius-full)",
    objectFit: "cover",
    flexShrink: 0,
    background: "var(--md-sys-color-surface-variant)",
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
    fontSize: "0.9375rem",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});

const Handle = styled("span", {
  base: {
    fontSize: "0.8125rem",
    color: "var(--md-sys-color-on-surface-variant)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});

const PostText = styled("div", {
  base: {
    fontSize: "0.9375rem",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
});
