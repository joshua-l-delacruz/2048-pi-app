require_relative "boot"

require "rails"
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "action_controller/railtie"
require "action_view/railtie"
require_relative "../lib/security_headers"

Bundler.require(*Rails.groups)

module PiGame
  class Application < Rails::Application
    config.load_defaults 7.2
    config.api_only = true
    config.public_file_server.enabled = true
    config.force_ssl = Rails.env.production?
    config.middleware.insert_before 0, SecurityHeaders
    config.action_dispatch.default_headers.merge!(
      "X-Content-Type-Options" => "nosniff",
      "Referrer-Policy" => "strict-origin-when-cross-origin",
      "Permissions-Policy" => "camera=(), microphone=(), geolocation=()"
    )
  end
end
