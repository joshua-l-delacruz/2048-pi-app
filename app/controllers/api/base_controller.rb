module Api
  class BaseController < ApplicationController
    before_action :disable_caching

    rescue_from ActionController::ParameterMissing do |error|
      render_error("INVALID_REQUEST", error.message, :unprocessable_entity)
    end

    private

    def disable_caching
      response.headers["Cache-Control"] = "no-store"
    end

    def authenticated_pi_user!
      token = params.require(:accessToken).to_s.strip
      return render_error("INVALID_TOKEN", "A valid Pi access token is required.", :unprocessable_entity) if token.blank? || token.length > 4096

      @pi_user = PiNetworkClient.new(token).current_user
    rescue PiNetworkClient::AuthenticationError => error
      render_error("AUTHENTICATION_FAILED", error.message, :unauthorized)
      nil
    rescue PiNetworkClient::UpstreamError => error
      render_error("PI_API_UNAVAILABLE", error.message, :bad_gateway)
      nil
    end

    def render_error(code, message, status)
      render json: { success: false, error: { code: code, message: message } }, status: status
    end
  end
end
