# xbot-ai

AI-powered X/Twitter automation bot that finds trends in your niche, generates original posts using AI, replies to viral tweets, and publishes with human-like scheduling.

## What it does

xbot-ai is an autonomous agent that runs in the background and grows your X account by:

1. **Searching trends** in your specific niche across multiple languages
2. **Generating original posts** using AI (never copies or translates directly)
3. **Replying to viral tweets** with deep, insightful comments that attract followers
4. **Moderating content** automatically before publishing (safety + on-topic check)
5. **Selecting relevant images** from trending tweets using AI-powered image matching
6. **Publishing posts** with text + images to your X account
7. **Scheduling** with human-like intervals (randomized delays, peak-hour awareness)
8. **A/B testing** post formats to discover what drives more engagement

## How it works

```
                    ┌─────────────────────────┐
                    │     Search Trends        │
                    │  (X API, multi-language)  │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                                     │
  ┌───────────▼───────────┐            ┌────────────▼───────────┐
  │  For each variant:     │            │  Viral Replies          │
  │                        │            │  (3% chance per tweet)  │
  │  Generate Post (AI)    │            │                         │
  │  Moderate (AI)         │            │  Generate Reply (AI)    │
  │  Pick Image (AI)       │            │  Moderate (AI)          │
  │  Publish to X          │            │  Reply to tweet         │
  │                        │            │                         │
  └───────────┬───────────┘            └────────────┬───────────┘
              │                                     │
              └──────────────────┬──────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Wait (human-like)      │
                    │   Next cycle...          │
                    └─────────────────────────┘
```

## Key features

### Niche-focused content

The bot only searches and generates content about your configured niche. Set `BOT_NICHE="AI tools and productivity"` and every post will be about that topic. No random off-topic content.

### Multi-language trend discovery

Search trends in English, Portuguese, French, or any language X supports. The bot finds viral content in other languages and generates original posts in your language.

```bash
BOT_LANGUAGE=en                  # Posts in English
BOT_SEARCH_LANGUAGES=en,ja,de   # Search trends in English, Japanese, German
```

### Post variants (A/B testing)

Each cycle generates multiple posts with different styles to help you discover what drives more engagement:

| Variant | Style | Length | Best for |
|---|---|---|---|
| `hot-take` | Short, provocative, debate-starting | 100-280 chars | Quick engagement, replies |
| `deep-insight` | Data-driven, analytical, informative | 300-600 chars | Bookmarks, shares, authority |

```bash
BOT_POST_VARIANTS=hot-take,deep-insight   # Both variants per cycle
BOT_POST_VARIANTS=hot-take                # Only short takes
BOT_POST_VARIANTS=deep-insight            # Only long-form
```

Example **hot-take** output:
> "Everyone pays for Midjourney when Ideogram does it free. Change my mind. #AI"

Example **deep-insight** output:
> "80% of companies report zero productivity gains from AI. But the 20% that do have one thing in common: they didn't just adopt tools, they redesigned workflows around them. I switched from using ChatGPT as a chatbot to using it as a pipeline (research > draft > Claude for review > Zapier to publish). Productivity jumped 3x in a week. The tool isn't the bottleneck — your process is. #AI #Productivity"

### Viral replies

The bot can automatically reply to trending tweets in your niche with deep, insightful comments. This is one of the most effective ways to grow on X — your reply appears under viral tweets where thousands of people are already looking.

```bash
BOT_REPLY_ENABLED=true       # Enable viral replies
BOT_REPLY_CHANCE_PERCENT=3   # Reply to ~3% of trending tweets per cycle
```

Each reply:
- Adds real value (data, experience, counterpoint) — never generic "great post!" spam
- Goes through the same AI moderation as regular posts
- References something specific from the original tweet
- Is written in your configured language
- Has randomized delays between replies (30-90 seconds) to avoid looking automated

Example reply to a viral tweet about AI tools:
> "The missing piece with Fireflies isn't the transcription — it's what happens after. I piped it into Notion AI to auto-generate action items and suddenly meetings actually led to outcomes. Without that second step, you just have transcripts nobody reads."

### AI-powered image selection

The bot doesn't blindly attach the first image it finds. After generating a post, it asks the AI to evaluate all available images from trending tweets and pick the one that best matches the post's topic. If no image is relevant, it publishes without one.

### Content moderation

Every post and reply goes through an AI moderation step before publishing. The moderator checks:
- Is the content safe to post?
- Does it stay on-topic for the configured niche?

Content that fails moderation is rejected and never published.

### Auto-shorten

If the AI generates a post slightly over the character limit, xbot-ai automatically asks the AI to shorten it while preserving the core message, specific tool names, and hashtags. Posts that are way over the limit are rejected and regenerated.

### Human-like scheduling

The scheduler avoids robotic patterns:
- **Randomized intervals** between cycles (not fixed every N minutes)
- **Peak-hour awareness** — posts more frequently during configured peak hours, less during off-peak
- **Jitter** — adds +/- 15% random noise to every interval
- **Configurable delay** between posts in the same cycle
- **Random delay** between replies (30-90 seconds)

### Multiple AI providers

Use any AI provider with zero code changes:

| Provider | Config | Cost |
|---|---|---|
| **Ollama** (local) | `AI_PROVIDER=ollama` | Free |
| **Groq** | `AI_PROVIDER=openai` + Groq URL | Free (rate limited) |
| **OpenAI** | `AI_PROVIDER=openai` | Pay per use |
| **Anthropic** | `AI_PROVIDER=anthropic` | Pay per use |
| **Together AI** | `AI_PROVIDER=openai` + Together URL | Pay per use |
| **LM Studio** | `AI_PROVIDER=openai` + localhost | Free |
| **DeepSeek** | `AI_PROVIDER=openai` + DeepSeek URL | Pay per use |
| Any OpenAI-compatible API | `AI_PROVIDER=openai` + custom URL | Varies |

### Debug mode

Enable `DEBUG=true` to see everything the bot is doing in real-time:
- Full prompts sent to the AI
- AI responses and generation stats (tokens/sec, elapsed time)
- X API queries and results
- Image selection decisions
- Reply targets and generated replies
- Scheduler calculations (peak hours, jitter, delays)
- Ollama streaming output (thinking + response tokens)

### Log to file

Enable `LOG_FILE=xbot.log` to write all output (including debug) to a file for later analysis.

## Quick start

### Prerequisites

- Node.js 22+
- X Developer account with **Basic** plan for search API
- X API credentials with **Read and Write** permissions
- An AI provider (Ollama local, Groq free, or any OpenAI-compatible API)

### Setup

```bash
git clone https://github.com/dvelez3815/xbot-ai.git
cd xbot-ai
npm install
cp .env.example .env
```

Edit `.env` with your credentials and configuration.

### Run

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start

# Docker
docker compose up -d
```

### Deploy to Kubernetes

```bash
# Edit secrets
cp deploy/helm/secret-values.yaml.example deploy/helm/secret-values.yaml
vim deploy/helm/secret-values.yaml

# Install
helm install xbot deploy/helm/ -n xbot-ai --create-namespace -f deploy/helm/secret-values.yaml

# Upgrade
helm upgrade xbot deploy/helm/ -n xbot-ai -f deploy/helm/secret-values.yaml
```

## Configuration reference

### X/Twitter credentials

| Variable | Required | Description |
|---|---|---|
| `X_BEARER_TOKEN` | Yes | App-only Bearer Token (for reading/searching) |
| `X_API_KEY` | Yes | Consumer API Key |
| `X_API_SECRET` | Yes | Consumer API Secret |
| `X_ACCESS_TOKEN` | Yes | User Access Token (for posting) |
| `X_ACCESS_SECRET` | Yes | User Access Token Secret |

### AI provider

| Variable | Default | Description |
|---|---|---|
| `AI_PROVIDER` | `ollama` | Provider: `ollama`, `anthropic`, or `openai` |
| `AI_BASE_URL` | Per provider | API endpoint URL |
| `AI_MODEL` | Per provider | Model name |
| `AI_API_KEY` | (empty) | API key (required for cloud providers) |
| `AI_TIMEOUT_SECONDS` | `300` | Request timeout |

### Bot behavior

| Variable | Default | Description |
|---|---|---|
| `BOT_NICHE` | `technology` | Your niche/topic focus |
| `BOT_LANGUAGE` | `en` | Language for generated posts |
| `BOT_SEARCH_LANGUAGES` | `en,ja,de` | Languages to search trends in |
| `BOT_MAX_RESULTS_PER_SEARCH` | `10` | Tweets to fetch per language |
| `BOT_EXPAND_AUTHORS` | `false` | Fetch author usernames ($0.01/user) |
| `BOT_POST_MAX_LENGTH` | `280` | Max post length (280 free, up to 25000 premium) |
| `BOT_POST_VARIANTS` | `hot-take,deep-insight` | Active post variants for A/B testing |
| `BOT_DELAY_BETWEEN_POSTS_SECONDS` | `180` | Delay between posts in same cycle |
| `BOT_POSTS_PER_DAY` | `8` | Daily post limit (across all variants) |
| `BOT_MIN_INTERVAL_MINUTES` | `45` | Minimum minutes between cycles |
| `BOT_MAX_INTERVAL_MINUTES` | `180` | Maximum minutes between cycles |
| `BOT_PEAK_HOURS` | `9,12,15,18,20` | Hours with higher posting frequency |
| `BOT_REPLY_ENABLED` | `false` | Enable replying to viral tweets |
| `BOT_REPLY_CHANCE_PERCENT` | `3` | Chance (0-100) of replying to each trending tweet |

### System

| Variable | Default | Description |
|---|---|---|
| `DEBUG` | `false` | Enable verbose logging |
| `LOG_FILE` | (empty) | Write all output to a file |

## Cost estimation (X API)

All costs are for the X API only. AI is free when using Ollama (local) or Groq (cloud free tier).

### Per-cycle breakdown

With `BOT_EXPAND_AUTHORS=false` and 2 variants (`hot-take` + `deep-insight`):

| Operation | Quantity | Unit cost | Cost per cycle |
|---|---|---|---|
| Posts: Read (search trends) | ~20 tweets | $0.005 | $0.10 |
| Content: Create (posts) | 2 | $0.010 | $0.02 |
| Content: Create (replies) | ~1 | $0.010 | $0.01 |
| **Total per cycle** | | | **~$0.13** |

### Monthly projections

| Cycles/day | Posts/day | Replies/day | X API cost/month | AI cost |
|---|---|---|---|---|
| 2 | 4 | ~2 | ~$8 | Free (Groq/Ollama) |
| 4 | 8 | ~4 | ~$16 | Free (Groq/Ollama) |
| 6 | 12 | ~6 | ~$24 | Free (Groq/Ollama) |

### Cost optimization tips

- Set `BOT_EXPAND_AUTHORS=false` to avoid $0.01/user reads (saves ~65%)
- Use 2 search languages instead of 3 (saves ~33% on reads)
- Lower `BOT_MAX_RESULTS_PER_SEARCH` from 10 to 5 (saves ~50% on reads)
- Use Groq or Ollama for AI generation (free)

## Project structure

```
src/
  index.ts                  # Entry point, CLI, graceful shutdown
  config.ts                 # Configuration loader from .env
  constants.ts              # Enums, env keys, language maps
  types.ts                  # TypeScript interfaces
  logger.ts                 # Logger with debug mode + file output
  core/
    engine.ts               # Main orchestrator (cycle loop + replies)
    content.ts              # AI content generation + moderation + replies
    trends.ts               # Trend search across languages
    variants/
      variant.ts            # PostVariant interface
      hot-take.ts           # Short, provocative post style
      deep-insight.ts       # Long, data-driven post style
      index.ts              # Variant registry + factory
  providers/
    provider.ts             # AIProvider interface
    ollama.ts               # Ollama local provider (with streaming)
    anthropic.ts            # Anthropic/Claude provider
    openai-compatible.ts    # OpenAI + compatible APIs provider
    utils.ts                # Thinking token cleanup
    index.ts                # Provider factory
  scheduler/
    scheduler.ts            # Human-like scheduling with jitter
  x/
    client.ts               # X API client (search, publish, reply, media)
deploy/
  helm/                     # Kubernetes Helm chart
    Chart.yaml
    values.yaml             # Public config
    secret-values.yaml      # Secrets (gitignored)
    templates/
      deployment.yaml
      configmap.yaml
      secret.yaml
.github/
  workflows/
    docker-publish.yml      # CI/CD: build + push to Docker Hub
```

## License

MIT
