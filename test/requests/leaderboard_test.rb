require "test_helper"

class LeaderboardTest < ActionDispatch::IntegrationTest
  test "returns one best privacy-safe row per player" do
    Score.create!(uid: "player-1", username: "joshuadelacruz", score: 512)
    Score.create!(uid: "player-1", username: "joshuadelacruz", score: 2_048)
    Score.create!(uid: "player-2", username: "john", score: 1_024)

    get "/api/leaderboard"

    assert_response :success
    rows = response.parsed_body.fetch("leaderboard")
    assert_equal 2, rows.length
    assert_equal 2_048, rows.first.fetch("score")
    assert_equal "jos***ruz", rows.first.fetch("username")
    assert_equal PlayerPublicId.for("player-1"), rows.first.fetch("player_id")
    refute rows.first.key?("uid")
  end
end
