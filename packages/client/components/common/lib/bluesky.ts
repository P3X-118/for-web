import CONFIGURATION from "./env";

/**
 * atproto session brokered by delta for the current chat user.
 *
 * delta authenticates the chat session, calls pds-pro server-to-server, and
 * returns a session for the user's OWN linked `<handle>.cooey.club` account.
 * The chat client uses it to read the user's Bluesky directly from their PDS.
 */
export interface AtprotoSession {
  accessJwt: string;
  refreshJwt: string;
  did: string;
  handle: string;
  /** PDS host the session is valid against, e.g. `https://cooey.club`. */
  pds: string;
}

/**
 * A single, flattened post for rendering in the in-chat feed.
 */
export interface BlueskyPost {
  uri: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  text: string;
  createdAt?: string;
}

/**
 * Broker the current chat user's atproto session via delta
 * (`GET /auth/atproto/session`).
 *
 * Returns `null` when the user has no active linked cooey.club account yet, or
 * when the broker is unavailable — callers should treat that as "not linked"
 * and surface a claim CTA rather than an error.
 */
export async function brokerAtprotoSession(
  sessionToken: string,
): Promise<AtprotoSession | null> {
  try {
    const res = await fetch(
      `${CONFIGURATION.DEFAULT_API_URL}/auth/atproto/session`,
      { headers: { "x-session-token": sessionToken } },
    );
    if (!res.ok) return null;
    return (await res.json()) as AtprotoSession;
  } catch {
    return null;
  }
}

/** Minimal shape of an `app.bsky.feed.defs#feedViewPost` we read. */
interface RawFeedItem {
  post?: {
    uri?: string;
    author?: { handle?: string; displayName?: string; avatar?: string };
    record?: { text?: string; createdAt?: string };
  };
}

/**
 * Fetch the user's Bluesky home timeline directly from their PDS, which proxies
 * `app.bsky.*` queries to its configured AppView. Throws on a non-OK response so
 * the caller can distinguish "reachable but empty" from "failed".
 */
export async function fetchTimeline(
  session: AtprotoSession,
  limit = 30,
): Promise<BlueskyPost[]> {
  const base = session.pds.replace(/\/$/, "");
  const res = await fetch(
    `${base}/xrpc/app.bsky.feed.getTimeline?limit=${limit}`,
    { headers: { authorization: `Bearer ${session.accessJwt}` } },
  );
  if (!res.ok) throw new Error(`getTimeline ${res.status}`);

  const data = (await res.json()) as { feed?: RawFeedItem[] };
  const feed = Array.isArray(data.feed) ? data.feed : [];

  return feed.map((item) => {
    const post = item.post ?? {};
    const author = post.author ?? {};
    const record = post.record ?? {};
    return {
      uri: post.uri ?? "",
      handle: author.handle ?? "",
      displayName: author.displayName,
      avatar: author.avatar,
      text: typeof record.text === "string" ? record.text : "",
      createdAt: record.createdAt,
    };
  });
}

/** The signed-in user's Bluesky profile, for the "your account" header. */
export interface BlueskyProfile {
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
}

/**
 * Fetch the signed-in user's own profile from their PDS (proxied to the
 * AppView). Returns `null` on any failure — the caller falls back to the bare
 * handle from the brokered session.
 */
export async function getProfile(
  session: AtprotoSession,
): Promise<BlueskyProfile | null> {
  try {
    const base = session.pds.replace(/\/$/, "");
    const res = await fetch(
      `${base}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(session.did)}`,
      { headers: { authorization: `Bearer ${session.accessJwt}` } },
    );
    if (!res.ok) return null;
    return (await res.json()) as BlueskyProfile;
  } catch {
    return null;
  }
}

/** Public Bluesky AppView profile URL for a handle (opens the full client). */
export function blueskyProfileUrl(handle: string): string {
  return `https://bsky.app/profile/${handle}`;
}
