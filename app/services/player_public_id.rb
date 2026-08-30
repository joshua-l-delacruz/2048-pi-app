require "openssl"

class PlayerPublicId
  PURPOSE = "pi-2048-leaderboard-player".freeze
  LENGTH = 32

  def self.for(uid)
    secret = ENV.fetch("PLAYER_ID_SECRET") { Rails.application.secret_key_base }
    OpenSSL::HMAC.hexdigest("SHA256", secret, "#{PURPOSE}:#{uid}").first(LENGTH)
  end
end
