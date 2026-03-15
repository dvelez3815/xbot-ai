# xbot-ai

AI-powered X/Twitter automation bot that finds trends in your niche, generates original posts using AI, and publishes them with human-like scheduling.

## What it does

xbot-ai is an autonomous agent that runs in the background and grows your X account by:

1. **Searching trends** in your specific niche across multiple languages
2. **Generating original posts** using AI (never copies or translates directly)
3. **Moderating content** automatically before publishing (safety + on-topic check)
4. **Selecting relevant images** from trending tweets using AI-powered image matching
5. **Publishing posts** with text + images to your X account
6. **Scheduling** with human-like intervals (randomized delays, peak-hour awareness)
7. **A/B testing** post formats to discover what drives more engagement

## How it works

```
                    ┌─────────────────────────┐
                    │     Search Trends        │
                    │  (X API, multi-language)  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   For each variant:      │
                    │                          │
                    │  ┌────────────────────┐  │
                    │  │  Generate Post (AI) │  │
                    │  └────────┬───────────┘  │
                    │           │               │
                    │  ┌────────▼───────────┐  │
                    │  │  Moderate (AI)      │  │
                    │  │  Safe? On-topic?    │  │
                    │  └────────┬───────────┘  │
                    │           │               │
                    │  ┌────────▼───────────┐  │
                    │  │  Pick Image (AI)    │  │
                    │  │  Relevant? Skip?    │  │
                    │  └────────┬───────────┘  │
                    │           │               │
                    │  ┌────────▼───────────┐  │
                    │  │  Publish to X       │  │
                    │  └────────────────────┘  │
                    │                          │
                    └────────────┬────────────┘
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
BOT_LANGUAGE=es                  # Posts in Spanish
BOT_SEARCH_LANGUAGES=en,pt,fr   # Search trends in English, Portuguese, French
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
> "La mayoria sobrevalua ChatGPT, cuando Jasper hace el trabajo igual de bien sin tantas limitaciones. Convenceme que estoy equivocado #ProductividadAI"

Example **deep-insight** output:
> "El 80% de empresas no ve ganancias en productividad con IA. Pero el problema no es la herramienta, es el proceso. Llevo 2 semanas usando Fireflies para transcribir reuniones y Claude para resumirlas. El combo de ambos ahorra mas que cualquier lista de 50 tools. La clave no es tener mas herramientas, es encadenarlas bien. #IA #Productividad"

### AI-powered image selection

The bot doesn't blindly attach the first image it finds. After generating a post, it asks the AI to evaluate all available images from trending tweets and pick the one that best matches the post's topic. If no image is relevant, it publishes without one.

### Content moderation

Every post goes through an AI moderation step before publishing. The moderator checks:
- Is the content safe to post?
- Does it stay on-topic for the configured niche?

Posts that fail moderation are rejected and never published.

### Auto-shorten

If the AI generates a post slightly over the character limit, xbot-ai automatically asks the AI to shorten it while preserving the core message, specific tool names, and hashtags. Posts that are way over the limit are rejected and regenerated.

### Human-like scheduling

The scheduler avoids robotic patterns:
- **Randomized intervals** between cycles (not fixed every N minutes)
- **Peak-hour awareness** — posts more frequently during configured peak hours, less during off-peak
- **Jitter** — adds +/- 15% random noise to every interval
- **Configurable delay** between posts in the same cycle

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
- Scheduler calculations (peak hours, jitter, delays)
- Ollama streaming output (thinking + response tokens)

### Log to file

Enable `LOG_FILE=xbot.log` to write all output (including debug) to a file for later analysis.

## Quick start

### Prerequisites

- Node.js 22+
- X Developer account with **Basic** plan ($100/month) for search API
- X API credentials with **Read and Write** permissions
- An AI provider (Ollama local, Groq free, or any OpenAI-compatible API)

### Setup

```bash
git clone https://github.com/your-username/xbot-ai.git
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
| `BOT_LANGUAGE` | `es` | Language for generated posts |
| `BOT_SEARCH_LANGUAGES` | `en,pt` | Languages to search trends in |
| `BOT_MAX_RESULTS_PER_SEARCH` | `10` | Tweets to fetch per language |
| `BOT_EXPAND_AUTHORS` | `false` | Fetch author usernames ($0.01/user) |
| `BOT_POST_MAX_LENGTH` | `280` | Max post length (280 free, up to 25000 premium) |
| `BOT_POST_VARIANTS` | `hot-take,deep-insight` | Active post variants for A/B testing |
| `BOT_DELAY_BETWEEN_POSTS_SECONDS` | `180` | Delay between posts in same cycle |
| `BOT_POSTS_PER_DAY` | `8` | Daily post limit (across all variants) |
| `BOT_MIN_INTERVAL_MINUTES` | `45` | Minimum minutes between cycles |
| `BOT_MAX_INTERVAL_MINUTES` | `180` | Maximum minutes between cycles |
| `BOT_PEAK_HOURS` | `9,12,15,18,20` | Hours with higher posting frequency |

### System

| Variable | Default | Description |
|---|---|---|
| `DEBUG` | `false` | Enable verbose logging |
| `LOG_FILE` | (empty) | Write all output to a file |

## Project structure

```
src/
  index.ts                  # Entry point, CLI, graceful shutdown
  config.ts                 # Configuration loader from .env
  constants.ts              # Enums, env keys, language maps
  types.ts                  # TypeScript interfaces
  logger.ts                 # Logger with debug mode + file output
  core/
    engine.ts               # Main orchestrator (cycle loop)
    content.ts              # AI content generation + moderation
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
    client.ts               # X API client (search, publish, media)
```

## Cost estimation (X API)

With `BOT_EXPAND_AUTHORS=false` (recommended):

| Posts/day | X API cost/month | AI cost/month |
|---|---|---|
| 4 | ~$6 | Free (Ollama/Groq) |
| 8 | ~$12 | Free (Ollama/Groq) |
| 12 | ~$18 | Free (Ollama/Groq) |

Main X API costs: `Posts: Read` ($0.005/tweet) + `Content: Create` ($0.01/post).

## License

MIT
