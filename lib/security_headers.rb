class SecurityHeaders
  CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "script-src 'self' https://sdk.minepi.com 'sha256-dxqaLModKkiAUdzFK7HzLAhZa445dMQDF16Q05D0mmc='",
    "style-src 'self' 'sha256-1iRCPujRILsz0mjmuKv9JhE+85X58btXRxMxzluHyX4='",
    "connect-src 'self' https://api.minepi.com",
    "img-src 'self' data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join("; ").freeze

  def initialize(app)
    @app = app
  end

  def call(env)
    status, headers, body = @app.call(env)
    headers["Content-Security-Policy"] = CONTENT_SECURITY_POLICY
    headers["Cross-Origin-Opener-Policy"] = "same-origin"
    headers["Cross-Origin-Resource-Policy"] = "same-origin"
    headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    headers["X-Content-Type-Options"] = "nosniff"
    headers["X-XSS-Protection"] = "0"
    headers["X-Frame-Options"] = "DENY"
    [status, headers, body]
  end
end
