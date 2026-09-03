require "test_helper"

class SecurityHeadersTest < ActiveSupport::TestCase
  test "page uses external assets allowed by the content security policy" do
    html = Rails.root.join("public/index.html").binread
    policy = SecurityHeaders::CONTENT_SECURITY_POLICY.split("; ").to_h do |directive|
      name, *sources = directive.split
      [name, sources]
    end

    assert_empty html.scan(/<style(?:\s[^>]*)?>/m), "styles must not be inline"
    assert_empty html.scan(/<script(?![^>]*\bsrc=)(?:\s[^>]*)?>/m), "scripts must not be inline"
    assert_includes html, '<link rel="stylesheet" href="/app.css">'
    assert_includes html, '<script src="/app.js" defer></script>'
    assert_includes policy.fetch("style-src"), "'self'"
    assert_includes policy.fetch("script-src"), "'self'"
  end
end
