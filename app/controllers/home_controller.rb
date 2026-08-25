class HomeController < ApplicationController
  def show
    send_file Rails.root.join("public", "index.html"),
              type: "text/html; charset=utf-8",
              disposition: "inline"
  end
end
