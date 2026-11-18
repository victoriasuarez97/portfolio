import assert from "node:assert/strict";
import test from "node:test";
import { createHandler } from "../supabase/functions/submit-song/index.ts";

const origin = "https://portfolio.example";
const trackId = "4cOdK2wGLETKBW3PvgPWqT";
const link = `https://open.spotify.com/track/${trackId}`;
const request = (body: unknown, headers: Record<string, string> = {}) => new Request("https://project.supabase.co/functions/v1/submit-song", {
  method: "POST", headers: { origin, "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
});

const setup = (responses: Response[], values: Record<string, string> = {}) => {
  const calls: { url: string; options?: RequestInit }[] = [];
  const handler = createHandler({
    env: (key) => ({
      SONGWALL_ALLOWED_ORIGINS: origin,
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SECRET_KEYS: JSON.stringify({ default: "sb_secret_server-only" }),
      ...values,
    })[key],
    fetch: (async (url, options) => {
      calls.push({ url: String(url), options });
      const response = responses.shift();
      assert.ok(response, `Unexpected upstream call: ${url}`);
      return response;
    }) as typeof fetch,
  });
  return { handler, calls };
};

test("only the configured portfolio origins can submit or preflight", async () => {
  const { handler, calls } = setup([]);
  const allowed = await handler(new Request("https://project.supabase.co", { method: "OPTIONS", headers: { origin } }));
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), origin);
  const rejected = await handler(request({ link }, { origin: "https://unrelated.example" }));
  assert.equal(rejected.status, 403);
  assert.equal(rejected.headers.get("Access-Control-Allow-Origin"), "null");
  assert.equal(calls.length, 0);
});

test("a missing origin allowlist fails closed", async () => {
  const { handler } = setup([], { SONGWALL_ALLOWED_ORIGINS: "" });
  assert.equal((await handler(request({ link }))).status, 503);
});

test("rejects non-track URLs, lookalike hosts, credentials, and malformed IDs", async () => {
  const { handler, calls } = setup([]);
  for (const invalid of [
    "https://open.spotify.com/playlist/4cOdK2wGLETKBW3PvgPWqT",
    "https://open.spotify.com.evil.example/track/4cOdK2wGLETKBW3PvgPWqT",
    "http://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
    "https://user:password@open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
    "https://open.spotify.com/track/invalid",
    `${link}/extra`,
  ]) assert.equal((await handler(request({ link: invalid }))).status, 400, invalid);
  assert.equal(calls.length, 0);
});

test("validates names, notes, JSON shape, and body size before contacting services", async () => {
  const { handler, calls } = setup([]);
  for (const body of [null, [], { link, who: 42 }, { link, msg: {} }, { link, who: "a".repeat(29) }, { link, msg: "a".repeat(141) }]) {
    assert.equal((await handler(request(body))).status, 400);
  }
  assert.equal((await handler(request({ link, ignored: "a".repeat(5000) }))).status, 413);
  assert.equal(calls.length, 0);
});

test("normalizes localized links and gets metadata from Spotify instead of the caller", async () => {
  const song = { id: "saved-id", link, title: "Real title", artist: "Real artist", cover: "", who: "Anonymous", msg: "No explanation. Just trust me." };
  const { handler, calls } = setup([
    Response.json(0),
    Response.json({ title: "Real title", author_name: "Real artist" }),
    Response.json([song]),
  ]);
  const response = await handler(request({
    link: `https://open.spotify.com/intl-es/track/${trackId}?si=tracking`,
    who: " ", msg: " ", title: "Fake title", visible: false, id: "caller-id",
  }));
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { song });
  const inserted = JSON.parse(String(calls[2].options?.body));
  const { id: _id, ...songFields } = song;
  assert.deepEqual(inserted, { track_id: trackId, ...songFields });
  assert.equal(inserted.id, undefined);
  assert.equal(inserted.visible, undefined);
  assert.equal(calls[1].url, `https://open.spotify.com/oembed?url=${encodeURIComponent(link)}`);
  assert.equal((calls[2].options?.headers as Record<string, string>).apikey, "sb_secret_server-only");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("a full submission quota stops before contacting Spotify", async () => {
  const { handler, calls } = setup([Response.json(42)]);
  const response = await handler(request({ link }));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "42");
  assert.equal(calls.length, 1);
});

test("database duplicate protection works across visitors and hides internal details", async () => {
  const { handler } = setup([
    Response.json(0), Response.json({ title: "Song" }),
    Response.json({ code: "23505", details: "private database detail" }, { status: 409 }),
  ]);
  const response = await handler(request({ link }));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "That song is already on the wall. Pick another track.");
});

test("Spotify failures don't save placeholder tracks to the shared database", async () => {
  for (const status of [404, 429, 500]) {
    const { handler, calls } = setup([Response.json(0), new Response(null, { status })]);
    const response = await handler(request({ link }));
    assert.equal(response.status, status === 404 ? 400 : 502);
    assert.equal(calls.length, 2);
  }
});

test("database failures never expose credentials or internal error messages", async () => {
  const { handler } = setup([Response.json({ secret: "sb_secret_server-only" }, { status: 500 })]);
  const response = await handler(request({ link }));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /sb_secret|database|reservation/i);
});
