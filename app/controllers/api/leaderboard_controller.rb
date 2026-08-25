module Api
  class LeaderboardController < BaseController
    def index
      rows = Score.best_per_player.limit(10).map do |score|
        {
          username: mask_username(score.username),
          score: score.score,
          created_at: score.created_at.iso8601
        }
      end

      render json: { success: true, leaderboard: rows }
    end

    private

    def mask_username(username)
      value = username.to_s
      "#{value.first(3)}***"
    end
  end
end
