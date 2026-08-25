Rails.application.routes.draw do
  get "/health", to: "health#show"

  namespace :api do
    post "/auth/validate", to: "auth#validate"
    post "/score", to: "scores#create"
    get "/leaderboard", to: "leaderboard#index"
  end

  get "/index.html", to: "home#show"
  root "home#show"
end
