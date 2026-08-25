# 2048 Pi Network - Rails Edition

A secure Ruby on Rails backend for the existing 2048 Pi Network game. Rails serves the game, validates Pi access tokens with the official Pi API, stores scores in PostgreSQL, and exposes a deduplicated leaderboard.

## Stack

- Ruby 3.3 and Rails 7.2
- PostgreSQL
- Puma
- Docker
- Render-compatible deployment
- Cloudflare DNS, TLS, WAF, caching, and rate limiting

## API

- `POST /api/auth/validate` — validates a Pi access token
- `POST /api/score` — validates the token again and records a score
- `GET /api/leaderboard` — returns each player's best score
- `GET /health` — deployment health check

## Local setup

1. Copy `.env.example` to `.env` and set a PostgreSQL `DATABASE_URL`.
2. Install Ruby 3.3.6 and Bundler.
3. Run `bundle install`.
4. Run `bin/rails db:prepare`.
5. Run `bin/rails server`, then open `http://localhost:3000`.

Docker may also be used:

```text
docker build -t 2048-pi-rails .
docker run --rm -p 3000:3000 --env-file .env 2048-pi-rails
```

Deployment instructions are in [docs/cloudflare-deployment.md](docs/cloudflare-deployment.md).

