class HealthController < ApplicationController
  def show
    ActiveRecord::Base.connection.execute("SELECT 1")
    render json: { ok: true, service: "2048 Pi Rails", database: true }
  rescue ActiveRecord::ActiveRecordError
    render json: { ok: false, service: "2048 Pi Rails", database: false }, status: :service_unavailable
  end
end
