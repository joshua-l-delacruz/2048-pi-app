class Score < ApplicationRecord
  validates :uid, :username, presence: true, length: { maximum: 255 }
  validates :score, numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 10_000_000 }

  scope :best_per_player, lambda {
    ranked = select("scores.*, ROW_NUMBER() OVER (PARTITION BY uid ORDER BY score DESC, created_at ASC, id ASC) AS player_rank")
    from("(#{ranked.to_sql}) scores").where(player_rank: 1).order(score: :desc, created_at: :asc)
  }
end
