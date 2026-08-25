class CreateScores < ActiveRecord::Migration[7.2]
  def change
    create_table :scores do |table|
      table.string :uid, null: false
      table.string :username, null: false
      table.bigint :score, null: false
      table.timestamps
    end

    add_index :scores, [:uid, :created_at]
    add_index :scores, [:score, :created_at]
  end
end
