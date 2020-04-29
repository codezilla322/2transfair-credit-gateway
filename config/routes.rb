Rails.application.routes.draw do
  root :to => 'home#index'
  mount ShopifyApp::Engine, at: '/'
  post '/setting', to: 'home#setting'
  post '/api/login', to: 'api#login'
  post '/api/verify', to: 'api#verify'
  post '/api/resend', to: 'api#resend'
end
