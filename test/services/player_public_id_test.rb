require "test_helper"

class PlayerPublicIdTest < ActiveSupport::TestCase
  test "returns a stable opaque identifier without exposing the UID" do
    original_secret = ENV["PLAYER_ID_SECRET"]
    ENV["PLAYER_ID_SECRET"] = "test-player-id-secret"

    identifier = PlayerPublicId.for("pi-user-123")

    assert_equal identifier, PlayerPublicId.for("pi-user-123")
    assert_equal 32, identifier.length
    refute_includes identifier, "pi-user-123"
    refute_equal identifier, PlayerPublicId.for("another-user")
  ensure
    ENV["PLAYER_ID_SECRET"] = original_secret
  end
end
