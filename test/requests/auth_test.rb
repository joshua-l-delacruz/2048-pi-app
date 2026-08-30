require "test_helper"

class AuthTest < ActionDispatch::IntegrationTest
  test "returns a verified user and privacy-safe player identifier" do
    user = { uid: "pi-user-123", username: "JoshuaDelacruz" }
    client = Object.new
    client.define_singleton_method(:current_user) { user }

    PiNetworkClient.stub(:new, client) do
      post "/api/auth/validate", params: { accessToken: "valid-token" }, as: :json
    end

    assert_response :success
    payload = response.parsed_body
    assert_equal true, payload.fetch("success")
    assert_equal "pi-user-123", payload.dig("user", "uid")
    assert_equal "JoshuaDelacruz", payload.dig("user", "username")
    assert_equal PlayerPublicId.for("pi-user-123"), payload.dig("user", "player_id")
  end

  test "rejects a missing token with the standard error envelope" do
    post "/api/auth/validate", params: {}, as: :json

    assert_response :unprocessable_entity
    assert_equal "INVALID_REQUEST", response.parsed_body.dig("error", "code")
    assert_equal "no-store", response.headers["Cache-Control"]
  end
end
