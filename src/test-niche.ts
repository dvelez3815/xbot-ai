import "dotenv/config";
import { TwitterApi } from "twitter-api-v2";

const client = new TwitterApi(process.env.X_BEARER_TOKEN!);

async function test(niche: string) {
  const sanitized = niche.replace(/\b(AND|OR|NOT|and|or|not)\b/g, "").replace(/\s+/g, " ").trim();
  const words = sanitized.split(" ");
  const searchTerms = words.length <= 3 ? sanitized : words.join(" OR ");
  const query = `(${searchTerms}) lang:en -is:retweet -is:reply has:media`;

  console.log(`\n--- ${niche} ---`);
  console.log(`Query: ${query}\n`);

  try {
    const result = await client.v2.search(query, {
      max_results: 10,
      "tweet.fields": ["public_metrics"],
      sort_order: "relevancy",
    });

    const tweets = result.data?.data ?? [];
    const topLikes = tweets.reduce((max, t) => Math.max(max, t.public_metrics?.like_count ?? 0), 0);

    console.log(`  Results: ${tweets.length} tweets | Top likes: ${topLikes}\n`);
    for (const t of tweets.slice(0, 5)) {
      const m = t.public_metrics;
      console.log(`  ${m?.like_count ?? 0} likes | ${t.text.slice(0, 140)}`);
    }
    if (tweets.length === 0) console.log("  (no results)");
  } catch (err) {
    console.log(`  Error: ${err instanceof Error ? err.message : err}`);
  }
}

async function main() {
  const niches = process.argv.slice(2);

  if (niches.length === 0) {
    console.log("Usage: npx tsx src/test-niche.ts \"niche 1\" \"niche 2\" ...\n");
    console.log("Example: npx tsx src/test-niche.ts \"AI workflow automation\" \"infosec hacking\" \"LLM tools\"");
    process.exit(1);
  }

  for (const niche of niches) {
    await test(niche);
  }
}

main();
