module Api
  class LeaderboardController < BaseController
    def index
      rows = Score.best_per_player.limit(10).map do |score|
        {
          player_id: PlayerPublicId.for(score.uid),
          username: mask_username(score.username),
          score: score.score,
          created_at: score.created_at.iso8601
        }
      end

      render json: { success: true, leaderboard: rows }
    end

    private

    def mask_username(username)
      value = username.to_s.strip
      return "***" if value.blank?
      return "*" * value.length if value.length <= 2
      return "#{value.first}#{'*' * (value.length - 2)}#{value.last}" if value.length <= 4

      "#{value.first(3)}***#{value.last(3)}"
    end
  end
end
