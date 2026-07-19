import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { XClient } from "../src/x/client.js";
import type { XCredentials } from "../src/types.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function credentials(): XCredentials {
  return {
    bearerToken: "bearer",
    apiKey: "api-key",
    apiSecret: "api-secret",
    accessToken: "access-token",
    accessSecret: "access-secret",
    xquik: {
      apiKey: "xq_test",
      account: "@example",
      baseUrl: "https://xquik.example/",
    },
  };
}

test("posts replies through Xquik with the documented request contract", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    capturedUrl = input.toString();
    capturedInit = init;
    return Response.json({ success: true, tweetId: "1234567890" });
  };

  const result = await new XClient(credentials()).replyToTweet("A useful reply", "9876543210");

  assert.deepEqual(result, { id: "1234567890" });
  assert.equal(capturedUrl, "https://xquik.example/api/v1/x/tweets");
  assert.equal(capturedInit?.method, "POST");
  assert.deepEqual(capturedInit?.headers, {
    "Content-Type": "application/json",
    "x-api-key": "xq_test",
  });
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
    account: "@example",
    text: "A useful reply",
    reply_to_tweet_id: "9876543210",
  });
});

test("surfaces Xquik API errors without falling through to the X API", async () => {
  globalThis.fetch = async () =>
    Response.json(
      { error: "account_not_found", message: "Connect the account first." },
      { status: 404 },
    );

  await assert.rejects(
    new XClient(credentials()).publishTweet("Hello"),
    /Xquik create tweet failed with 404: account_not_found/,
  );
});
