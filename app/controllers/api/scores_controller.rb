module Api
  class ScoresController < BaseController
    COOLDOWN = 10.seconds
    MAX_SCORE = 10_000_000

    def create
      score_value = Integer(params.require(:score), exception: false)
      return render_error("INVALID_SCORE", "Score must be an integer between 0 and #{MAX_SCORE}.", :unprocessable_entity) unless score_value&.between?(0, MAX_SCORE)

      user = authenticated_pi_user!
      return if performed? || user.nil?

      saved = false

      Score.transaction do
        acquire_submission_lock(user.fetch(:uid))

        latest = Score.where(uid: user.fetch(:uid)).order(created_at: :desc).first
        if latest && latest.created_at > COOLDOWN.ago
          raise ActiveRecord::Rollback
        end

        Score.create!(uid: user.fetch(:uid), username: user.fetch(:username), score: score_value)
        saved = true
      end

      return render_error("RATE_LIMITED", "Please wait before submitting another score.", :too_many_requests) unless saved

      render json: { success: true, message: "Score saved successfully" }, status: :created
    rescue ActiveRecord::RecordInvalid => error
      render_error("SAVE_FAILED", error.record.errors.full_messages.to_sentence, :unprocessable_entity)
    rescue ActiveRecord::ActiveRecordError => error
      Rails.logger.error("Score persistence failed: #{error.class}: #{error.message}")
      render_error("DATABASE_UNAVAILABLE", "The score service is temporarily unavailable.", :service_unavailable)
    end

    private

    def acquire_submission_lock(uid)
      quoted_uid = ActiveRecord::Base.connection.quote(uid)
      ActiveRecord::Base.connection.execute(
        "SELECT pg_advisory_xact_lock(hashtextextended(#{quoted_uid}, 0))"
      )
    end
  end
end
