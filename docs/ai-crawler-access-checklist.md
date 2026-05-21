# AI Crawler Access Checklist

Use this after deploying SEO or AI-search changes. `robots.txt` is necessary, but it is not sufficient if Cloudflare, a WAF, Bot Fight Mode, or host-level rules challenge or block the crawler before it reaches the file.

## Required Public Artifacts

- `https://www.timemission.com/robots.txt` returns `200` and includes `Sitemap: https://www.timemission.com/sitemap.xml`.
- `https://www.timemission.com/sitemap.xml` returns `200` and includes only canonical public web pages.
- `https://www.timemission.com/llms.txt` returns `200` and links to every AI-readable context file.
- `https://www.timemission.com/llms-full.txt` returns `200` and exposes the complete AI context bundle.
- `https://www.timemission.com/ai-context.md` returns `200`.
- `https://www.timemission.com/pricing.md` returns `200`.
- `https://timemission.com/robots.txt` either redirects to the `www` robots file or serves a robots file with the same `Sitemap:` line.

## Citation/Search Crawlers To Allow

These are the highest-priority user agents for AI search visibility and source citation:

- `OAI-SearchBot`
- `ChatGPT-User`
- `PerplexityBot`
- `Claude-User`
- `Claude-SearchBot`
- `Bingbot`
- `Googlebot`

## Training/Grounding Crawlers To Decide Explicitly

The current public posture allows these crawlers. If the business later wants search citation but not training, revisit these separately instead of blocking everything:

- `GPTBot`
- `ClaudeBot`
- `Google-Extended`
- `Applebot-Extended`
- `CCBot`
- `anthropic-ai`

## Cloudflare/WAF Checks

- Disable or bypass any managed rule that returns `403`, `429`, JavaScript challenge, Turnstile, or CAPTCHA for the allowed crawler user agents above.
- Confirm Cloudflare AI Crawl Control, Bot Fight Mode, Super Bot Fight Mode, WAF custom rules, rate limits, and Transform Rules do not override the project `robots.txt`.
- If Cloudflare managed `robots.txt` is enabled, confirm it is not replacing the deployed `robots.txt`.
- Allow crawler access to text and markdown files, not just HTML.

## Verification Commands

Run these from a network outside Cloudflare's admin console after deploy:

```bash
curl -IL https://www.timemission.com/robots.txt
curl -IL https://www.timemission.com/llms.txt
curl -IL https://www.timemission.com/llms-full.txt
curl -IL https://www.timemission.com/ai-context.md
curl -IL https://www.timemission.com/pricing.md
curl -IL -A "OAI-SearchBot" https://www.timemission.com/llms.txt
curl -IL -A "ChatGPT-User" https://www.timemission.com/llms.txt
curl -IL -A "PerplexityBot" https://www.timemission.com/llms.txt
curl -IL -A "Claude-User" https://www.timemission.com/llms.txt
curl -IL -A "Claude-SearchBot" https://www.timemission.com/llms.txt
```

Passing responses should be `200` or a clean `301`/`308` to the `www` canonical host, followed by `200`. Failing responses include `403`, `429`, `503`, bot challenge pages, HTML challenge bodies, or missing `Sitemap:` lines.
