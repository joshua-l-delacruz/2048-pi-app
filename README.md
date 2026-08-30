# 2048 Pi Network — Rails Edition

[![CI](https://github.com/joshua-l-delacruz/2048-pi-app/actions/workflows/ci.yml/badge.svg)](https://github.com/joshua-l-delacruz/2048-pi-app/actions/workflows/ci.yml)

A production-deployed 2048 game with Pi Network authentication, a Ruby on Rails API, PostgreSQL score storage, and a privacy-conscious leaderboard.

**[Play the live application](https://2048.joshuadelacruz.solutions)**

**Architecture:** Rails 7.2 · Ruby 3.3 · PostgreSQL · Docker · Render · Cloudflare

![2048 Pi game interface](https://raw.githubusercontent.com/joshua-l-delacruz/lab-docs/main/assets/images/pi-2048-game.png)

> **Portfolio scope:** Authentication is server-verified, but scores remain client-authoritative. Treat the leaderboard as a demonstration, not as a prize-bearing competitive system.

## What this project demonstrates

- Server-side validation of Pi access tokens against the official Pi API
- Server-derived player identity rather than trust in a submitted username
- Validated and rate-limited score submission
- One best score per player in the top-10 leaderboard
- Privacy-conscious display names, opaque player IDs, and no-store API responses
- Containerized deployment with a database-aware health check
- Defense-in-depth HTTP security headers at the Cloudflare edge
- Automated request and service tests in GitHub Actions

## Request flow

```text
Pi Browser / Web Client
        |
        | Pi SDK authentication and HTTPS API requests
        v
Cloudflare (TLS, WAF, rate limiting, security headers)
        |
        v
Rails API on Render -----------------> Official Pi API /v2/me
        |                               validates bearer token
        v
PostgreSQL
scores and best-per-player leaderboard
```

## Security model

The browser obtains an access token through the Pi SDK. Rails does not accept the browser's claimed identity as authoritative: it sends the bearer token to the official Pi `/v2/me` endpoint and uses the returned `uid` and `username` for authentication and score ownership.

The API also applies these controls:

- Tokens are required, trimmed, and rejected when blank or longer than 4,096 characters.
- Pi API connections require HTTPS and have explicit connection and read timeouts.
- Scores must be integers from `0` through `10,000,000`.
- A transaction-scoped per-player advisory lock makes the 10-second submission cooldown atomic across concurrent requests.
- Leaderboard rows are deduplicated by Pi UID, ordered deterministically, and limited to ten.
- Public leaderboard usernames are masked, while HMAC-derived player IDs support `YOU` highlighting without exposing raw Pi UIDs.
- API responses use `Cache-Control: no-store`.
- Cloudflare provides HTTPS enforcement, HSTS, CSP, clickjacking protection, MIME sniffing protection, referrer controls, and edge rate limiting.

## Trust boundary and known limitation

Authentication and player identity are server-verified. The current game score is still client-authoritative: the server validates the player's Pi identity, score type, score range, and submission frequency, but it does **not** replay every move or prove that the submitted score came from a legitimate game session.

That distinction is deliberate and documented. A higher-assurance competitive release should add signed server-issued game sessions, idempotency keys, minimum-duration and move-count checks, progression validation, and anomaly detection. The current leaderboard is suitable for a portfolio demonstration, not a prize-bearing competition.

## API

| Endpoint | Purpose | Important responses |
| --- | --- | --- |
| `POST /api/auth/validate` | Validate a Pi access token and return the verified user plus an opaque player ID | `200`, `401`, `422`, `502` |
| `POST /api/score` | Revalidate the token and record a score | `201`, `401`, `422`, `429`, `502` |
| `GET /api/leaderboard` | Return each player's best score, up to ten players | `200` |
| `GET /health` | Check application and database availability | `200`, `503` |

### Failure behavior

| Condition | Result |
| --- | --- |
| Blank or oversized Pi token | `422 INVALID_TOKEN` |
| Expired or rejected Pi token | `401 AUTHENTICATION_FAILED` |
| Pi API timeout, invalid response, or outage | `502 PI_API_UNAVAILABLE` |
| Missing or out-of-range score | `422 INVALID_REQUEST` or `422 INVALID_SCORE` |
| Submission during the cooldown | `429 RATE_LIMITED` |
| Database health-check failure | `/health` returns `503` |

Errors use a consistent JSON envelope with a stable machine-readable code and a human-readable message.

## Local setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` for PostgreSQL and replace `SECRET_KEY_BASE` and `PLAYER_ID_SECRET` with separate long random secrets.
3. Keep `PI_API_URL=https://api.minepi.com/v2/me` unless using an explicitly controlled test endpoint.
4. Install Ruby 3.3.6 and Bundler.
5. Run `bundle install`, `bin/rails db:prepare`, and `bin/rails server`.
6. Open `http://localhost:3000`.

The UI can be explored in demo mode outside Pi Browser. Real Pi authentication requires the Pi SDK environment and a valid Pi access token; never commit tokens or production secrets.

Docker may also be used:

```text
docker build -t 2048-pi-rails .
docker run --rm -p 3000:3000 --env-file .env 2048-pi-rails
```

Run the automated test suite with:

```text
RAILS_ENV=test bin/rails db:prepare
bin/rails test
```

## Production deployment

The Render Blueprint provisions the Rails web service and PostgreSQL database. Cloudflare fronts the custom domain for DNS, TLS, caching rules, WAF controls, rate limiting, and security headers. The legacy Vercel URL can serve only the static shell and should not be used for Pi authentication, score persistence, or leaderboard APIs.

See [docs/cloudflare-deployment.md](docs/cloudflare-deployment.md) for deployment details.

## Verification checklist

- Confirm `/health` reports both application and database availability.
- Confirm invalid tokens fail without creating scores.
- Confirm malformed and out-of-range scores return `422`.
- Confirm rapid repeat submissions return `429`.
- Confirm the leaderboard shows only the best score per UID and masks usernames.
- Confirm the authenticated player's opaque ID marks only their row as `YOU`.
- Confirm production responses retain the expected Cloudflare security headers.

## Roadmap

- Server-issued game-session nonce and expiry
- Move-count, duration, and score-progression validation
- Idempotent score submissions
- Suspicious-score telemetry and moderation workflow
- Browser-level game and Pi SDK integration tests

## Portfolio scope

This is an independently built portfolio application. Pi Network authentication is integrated through its public SDK/API; this project is not presented as an official Pi Network product or endorsement.

## Contributing

Focused bug reports and security-conscious improvements are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request. Please do not include Pi access tokens, credentials, or personal information in reports.

## License

No open-source license has been selected yet. Copyright remains with the repository owner unless a license is added.
