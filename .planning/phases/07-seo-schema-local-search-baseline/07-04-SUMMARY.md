# Phase 7 — Plan 07-04 Summary

## Delivered

- `src/pages/sitemap.xml.ts` — Pattern 2b sitemap from `routes.json` (`sitemap === true` only); XML-escaped locs; root `https://timemission.com/`.
- `src/pages/llms.txt.ts` — llmstxt.org-shaped Markdown; URLs only from sitemap-eligible set; titles/descriptions from `seo-routes.json`.
- `robots.txt` — D-12 AI crawler `User-agent` groups + `Allow: /`; existing `Disallow` preserved; `Sitemap:` line unchanged target.
- `scripts/sync-static-to-public.mjs` — dropped `sitemap.xml` from `mandatoryFiles`; delete stale `public/sitemap.xml` so Astro endpoint is not shadowed.
- `scripts/check-sitemap-output.js`, `check-robots-ai-bots.js`, `check-llms-txt.js` + npm scripts `check:sitemap-output`, `check:robots-ai`, `check:llms-txt`.

## D-12 verification (2026-04-29)

- OpenAI: `https://platform.openai.com/docs/bots` — GPTBot, OAI-SearchBot, ChatGPT-User.
- Google: `https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers` — Google-Extended robots token.
- Perplexity: `https://docs.perplexity.ai/guides/bots` — PerplexityBot.
- Apple: `https://support.apple.com/en-us/119829` — Applebot-Extended (training opt-out token).
- Anthropic: official article fetch timed out; tokens ClaudeBot, Claude-User, Claude-SearchBot, anthropic-ai per Phase 7 research baseline.
- Bytespider intentionally omitted (falls through to `User-agent: *`).

## Notes

- GitNexus `impact` for `check-sitemap` / `sync-static-to-public` returned target not found (index stale).
