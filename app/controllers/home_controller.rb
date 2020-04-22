class HomeController < AuthenticatedController
  def index
    shop = Shop.find_by(shopify_domain: @current_shopify_session.domain)
    @shop_setting_api_key = shop[:app_id_2transfair]
  end
  def setting
    app_id_2transfair = params[:app_id_2transfair]
    shop = Shop.find_by(shopify_domain: @current_shopify_session.domain)
    shop[:app_id_2transfair] = app_id_2transfair
    shop.save!
    redirect_to "/"
  end
end