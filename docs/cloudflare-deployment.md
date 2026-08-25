# Deploy Rails with Render and Cloudflare

Cloudflare Workers cannot run a Ruby on Rails server directly. This architecture runs the Rails container on Render and places Cloudflare in front of it for the custom domain, TLS, WAF, caching, and abuse protection.

## 1. Provision PostgreSQL

Create a managed PostgreSQL database on Render, Neon, or another provider. Copy its private or pooled connection string into the Render service as `DATABASE_URL`.

## 2. Deploy the Rails service

1. Connect this GitHub repository to Render.
2. Choose **Blueprint** and use the repository's `render.yaml`.
3. Add `DATABASE_URL`.
4. Deploy. The container entrypoint runs `bin/rails db:prepare` before Puma starts.
5. Confirm `https://YOUR-RENDER-HOST/health` returns a successful response.

## 3. Put Cloudflare in front

1. In Cloudflare DNS, create a proxied CNAME such as `2048.joshuadelacruz.solutions` pointing to the Render hostname.
2. Add that custom domain in Render.
3. Set Cloudflare SSL/TLS mode to **Full (strict)** and enable **Always Use HTTPS**.
4. Create a cache rule that bypasses caching for `/api/*`.
5. Cache ordinary static assets, but never cache authentication or score responses.
6. Enable Cloudflare managed WAF rules.
7. Add rate limits for `POST /api/auth/validate` and `POST /api/score`.

Suggested starting limits are 20 authentication requests and 60 score requests per IP per minute. Observe legitimate usage before tightening them.

## 4. Configure Pi

In the Pi Developer Portal, update the app URL and any allowed domains to the Cloudflare custom hostname. Test authentication in Pi Browser before publishing.

## Security notes

- Pi access tokens are validated server-side; the browser's user identity is never trusted.
- The API returns `Cache-Control: no-store`.
- Scores have server-side type and range validation.
- PostgreSQL enforces persisted storage across instances.
- Security headers deny framing and restrict resources to this site, the Pi SDK, and the Pi API.
- Keep credentials in Render environment variables. Never commit secrets.

## Cost note

Cloudflare's proxy layer can remain inexpensive, but Rails and PostgreSQL still require an origin host. Free plans may sleep or change over time, so check current provider limits before production use.
