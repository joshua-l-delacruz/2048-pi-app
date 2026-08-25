module Api
  class AuthController < BaseController
    def validate
      user = authenticated_pi_user!
      return if performed? || user.nil?

      render json: { success: true, user: user }
    end
  end
end
