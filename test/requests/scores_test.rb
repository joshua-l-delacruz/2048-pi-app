require "test_helper"

class ScoresTest < ActionDispatch::IntegrationTest
  test "rejects malformed scores before calling Pi" do
    post "/api/score", params: { accessToken: "token", score: "not-a-number" }, as: :json

    assert_response :unprocessable_entity
    assert_equal "INVALID_SCORE", response.parsed_body.dig("error", "code")
  end

  test "persists identity returned by Pi rather than client identity" do
    user = { uid: "verified-uid", username: "verified-user" }
    client = Object.new
    client.define_singleton_method(:current_user) { user }

    PiNetworkClient.stub(:new, client) do
      post "/api/score",
           params: { accessToken: "valid-token", score: 4_096, uid: "forged", username: "forged" },
           as: :json
    end

    assert_response :created
    saved = Score.order(:id).last
    assert_equal "verified-uid", saved.uid
    assert_equal "verified-user", saved.username
    assert_equal 4_096, saved.score
  end

  test "rate limits a second submission inside the cooldown" do
    user = { uid: "cooldown-user", username: "cooldown-name" }
    Score.create!(uid: user.fetch(:uid), username: user.fetch(:username), score: 512)
    client = Object.new
    client.define_singleton_method(:current_user) { user }

    PiNetworkClient.stub(:new, client) do
      post "/api/score", params: { accessToken: "valid-token", score: 1_024 }, as: :json
    end

    assert_response :too_many_requests
    assert_equal "RATE_LIMITED", response.parsed_body.dig("error", "code")
    assert_equal 1, Score.where(uid: user.fetch(:uid)).count
  end
end
