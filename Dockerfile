# syntax=docker/dockerfile:1
FROM ruby:3.3.6-slim AS build

RUN apt-get update -qq && apt-get install --no-install-recommends -y build-essential libpq-dev git && rm -rf /var/lib/apt/lists/*
WORKDIR /rails
ENV BUNDLE_DEPLOYMENT=0 BUNDLE_PATH=/usr/local/bundle BUNDLE_WITHOUT="development:test"
COPY Gemfile Gemfile.lock* ./
RUN bundle install
COPY . .
RUN bundle exec bootsnap precompile app/ config/

FROM ruby:3.3.6-slim
RUN apt-get update -qq && apt-get install --no-install-recommends -y libpq5 curl && rm -rf /var/lib/apt/lists/*
WORKDIR /rails
ENV RAILS_ENV=production BUNDLE_DEPLOYMENT=1 BUNDLE_PATH=/usr/local/bundle BUNDLE_WITHOUT="development:test"
COPY --from=build /usr/local/bundle /usr/local/bundle
COPY --from=build /rails /rails
RUN chmod +x bin/rails bin/docker-entrypoint
ENTRYPOINT ["./bin/docker-entrypoint"]
EXPOSE 3000
CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
