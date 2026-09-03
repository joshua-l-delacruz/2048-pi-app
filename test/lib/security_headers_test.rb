require "test_helper"
require "base64"
require "digest"

class SecurityHeadersTest < ActiveSupport::TestCase
  test "content security policy permits every inline style and script" do
    html = Rails.root.join("public/index.html").binread
    policy = SecurityHeaders::CONTENT_SECURITY_POLICY.split("; ").to_h do |directive|
      name, *sources = directive.split
      [name, sources]
    end

    inline_blocks = {
      "style-src" => html.scan(/<style(?:\s[^>]*)?>(.*?)<\/style>/m).flatten,
      "script-src" => html.scan(/<script(?![^>]*\bsrc=)(?:\s[^>]*)?>(.*?)<\/script>/m).flatten
    }

    inline_blocks.each do |directive, blocks|
      refute_empty blocks, "expected at least one inline block for #{directive}"

      blocks.each do |block|
        source = "'sha256-#{Base64.strict_encode64(Digest::SHA256.digest(block))}'"
        assert_includes policy.fetch(directive), source,
          "#{directive} must allow the current inline content"
      end
    end
  end
end
