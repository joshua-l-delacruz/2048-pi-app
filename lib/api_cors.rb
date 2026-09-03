class ApiCors
  DEFAULT_ALLOWED_ORIGINS = %w[
    https://2048-indol-seven.vercel.app
    https://tueb2295.pinet.com
  ].freeze

  def initialize(app)
    @app = app
  end

  def call(env)
    origin = env["HTTP_ORIGIN"].to_s

    if preflight?(env) && allowed_origin?(origin)
      return [204, cors_headers(origin), []]
    end

    status, headers, body = @app.call(env)
    headers.merge!(cors_headers(origin)) if api_request?(env) && allowed_origin?(origin)
    [status, headers, body]
  end

  private

  def allowed_origins
    configured = ENV.fetch("CORS_ALLOWED_ORIGINS", "").split(",").map(&:strip).reject(&:empty?)
    DEFAULT_ALLOWED_ORIGINS | configured
  end

  def allowed_origin?(origin)
    allowed_origins.include?(origin)
  end

  def api_request?(env)
    env["PATH_INFO"].to_s.start_with?("/api/")
  end

  def preflight?(env)
    api_request?(env) && env["REQUEST_METHOD"] == "OPTIONS"
  end

  def cors_headers(origin)
    {
      "Access-Control-Allow-Origin" => origin,
      "Access-Control-Allow-Methods" => "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers" => "Content-Type",
      "Access-Control-Max-Age" => "600",
      "Cache-Control" => "no-store",
      "Vary" => "Origin"
    }
  end
end
