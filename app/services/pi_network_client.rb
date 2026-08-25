require "net/http"
require "json"

class PiNetworkClient
  DEFAULT_API_URL = "https://api.minepi.com/v2/me".freeze

  class AuthenticationError < StandardError; end
  class UpstreamError < StandardError; end

  def initialize(access_token)
    @access_token = access_token
  end

  def current_user
    api_url = URI(ENV.fetch("PI_API_URL", DEFAULT_API_URL))
    raise UpstreamError, "Pi API URL must use HTTPS." unless api_url.is_a?(URI::HTTPS)

    request = Net::HTTP::Get.new(api_url)
    request["Authorization"] = "Bearer #{@access_token}"
    request["Accept"] = "application/json"

    response = Net::HTTP.start(api_url.host, api_url.port, use_ssl: true, open_timeout: 5, read_timeout: 8) do |http|
      http.request(request)
    end

    raise AuthenticationError, "Pi authentication was rejected." if response.code.to_i.in?([401, 403])
    raise UpstreamError, "Pi authentication service is temporarily unavailable." unless response.is_a?(Net::HTTPSuccess)

    payload = JSON.parse(response.body)
    uid = payload["uid"].to_s.strip
    username = payload["username"].to_s.strip
    raise AuthenticationError, "Pi did not return a valid user identity." if uid.blank? || username.blank?

    { uid: uid, username: username }
  rescue JSON::ParserError
    raise UpstreamError, "Pi returned an invalid response."
  rescue URI::InvalidURIError
    raise UpstreamError, "Pi API URL is invalid."
  rescue Net::OpenTimeout, Net::ReadTimeout, SocketError
    raise UpstreamError, "Pi authentication service could not be reached."
  end
end
