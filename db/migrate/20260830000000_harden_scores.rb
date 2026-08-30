class HardenScores < ActiveRecord::Migration[7.2]
  def change
    add_check_constraint :scores,
                         "score >= 0 AND score <= 10000000",
                         name: "scores_value_range"
    add_check_constraint :scores,
                         "char_length(uid) BETWEEN 1 AND 255",
                         name: "scores_uid_length"
    add_check_constraint :scores,
                         "char_length(username) BETWEEN 1 AND 255",
                         name: "scores_username_length"

    add_index :scores,
              [:uid, :score, :created_at, :id],
              order: { score: :desc, created_at: :asc, id: :asc },
              name: "index_scores_for_best_per_player"
  end
end
