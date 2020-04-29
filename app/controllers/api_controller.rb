require 'shopify_api'
require 'httparty'
require 'dotenv'
Dotenv.load

class ApiController < ApplicationController
  skip_before_action :verify_authenticity_token

  def login
    shop_domain = params[:shop_domain]
    shop = Shop.find_by(shopify_domain: shop_domain)
    if shop.nil?
      result = {
        :code => 0,
        :msg => "El dominio de Shopify no existe."
      }
      render :json => result
      return
    end

    email = params[:email]
    password = params[:password]
    cart_token = params[:cart_token]
    checkout_token = params[:checkout_token]
    api_url = ENV['API_ENDPOINT_URL'] + '/users/login_ecommerce'
    api_header_key = ENV['API_HEADER_KEY'];
    headers = {}
    headers[api_header_key] = shop[:app_id_2transfair]
    query = {
      :email => email,
      :password => password
    }
    response = HTTParty.post(api_url, :headers => headers, :query => query)
    if response.body.nil? || response.body.empty?
      result = { :code => 0, :msg => "Error de servidor interno." }
    else
      puts response.parsed_response
      if response.code == 200
        auth_token = response.parsed_response['auth_token']
        phone_number = response.parsed_response['phone_number']

        api_url = ENV['API_ENDPOINT_URL'] + '/users/generate_send_payment_token'
        headers[:Authorization] = auth_token
        query = { :transaction_type => 'payment' }
        response = HTTParty.post(api_url, :headers => headers, :query => query)
        if response.body.nil? || response.body.empty?
          result = { :code => 0, :msg => "Error de servidor interno." }
        else
          puts response.parsed_response

          api_url = ENV['API_ENDPOINT_URL'] + '/users/get_terms'
          query = { :cart_id => cart_token, :url_token => checkout_token }
          response = HTTParty.post(api_url, :headers => headers, :query => query)
          puts response.code
          if response.body.nil? || response.body.empty?
            result = { :code => 0, :msg => "Error de servidor interno." }
          else
            puts response.parsed_response
            if response.code == 200
              result = {
                :code => 1,
                :auth_token => auth_token,
                :phone_number => phone_number,
                :total_value => response.parsed_response['total_value'],
                :url => response.parsed_response['url'],
                :terms => response.parsed_response['terms']
              }
            else
              result = {
                :code => 0,
                :msg => response.parsed_response['message']
              }
            end
          end
        end
      else
        result = {
          :code => 0,
          :msg => response.parsed_response['message']
        }
      end
    end
    render :json => result
  end
  def verify
    shop_domain = params[:shop_domain]
    shop = Shop.find_by(shopify_domain: shop_domain)
    if shop.nil?
      result = {
        :code => 0,
        :msg => "El dominio de Shopify no existe."
      }
      render :json => result
      return
    end

    email = params[:email]
    checkout_token = params[:checkout_token]
    payment_code = params[:payment_code]
    value = params[:value]
    terms = params[:terms]

    api_url = ENV['API_ENDPOINT_URL'] + '/users/validate_transaction_payment_token'
    api_header_key = ENV['API_HEADER_KEY']
    header = {}
    header[api_header_key] = shop[:app_id_2transfair]
    query = {
      :email => email,
      :reference_code => checkout_token,
      :payment_code => payment_code,
      :transaction_type => "checkout",
      :value => value,
      :terms => terms
    }
    response = HTTParty.post(api_url, :headers => header, :query => query)
    if response.body.nil? || response.body.empty?
      result = { :code => 0, :msg => "Error de servidor interno." }
    else
      puts response.code
      puts response.parsed_response
      message = response.parsed_response['message']
      if response.code != 200
        result = { :code => 0, :msg => message }
      else
        discount_amount = value

        # ***Code for public app***
        # shopify_session = ShopifyAPI::Session.new(
        #   domain: shop.shopify_domain,
        #   token: shop.shopify_token,
        #   api_version: shop.api_version,
        # )
        # ShopifyAPI::Base.activate_session(shopify_session)

        # ***Code for current private app***
        private_api_key = ENV['SHOPIFY_PRIVATE_API_KEY']
        private_api_password = ENV['SHOPIFY_PRIVATE_API_PASSWORD']
        shop_url = "https://#{private_api_key}:#{private_api_password}@#{shop_domain}"
        ShopifyAPI::Base.site = shop_url
        ShopifyAPI::Base.api_version = '2020-04'
        
        # ***Reusable code***
        # accesstokens = ShopifyAPI::StorefrontAccessToken.find(:all)
        # if accesstokens.empty?
        #   accesstoken = ShopifyAPI::StorefrontAccessToken.create(title: 'discount-apply')
        # else
        #   accesstoken = accesstokens[0]
        # end
        # checkouts = ShopifyAPI::Checkout.find(:all)
        # checkout = checkouts.find { |record| record.token == checkout_token }
        
        token = SecureRandom.hex(12)
        pricerule = ShopifyAPI::PriceRule.new
        pricerule.title = token
        pricerule.target_type = "line_item"
        pricerule.target_selection = "all"
        pricerule.allocation_method = "across"
        pricerule.value_type = "fixed_amount"
        pricerule.value = "-" + discount_amount
        pricerule.customer_selection = "all"
        pricerule.once_per_customer = true
        pricerule.usage_limit = 1
        pricerule.starts_at = Date.yesterday.strftime("%Y-%m-%dT00:00:00-05:00")
        pricerule.ends_at = Date.tomorrow.strftime("%Y-%m-%dT23:59:59-05:00")
        pricerule.save
        discountcode = ShopifyAPI::DiscountCode.new(price_rule_id: pricerule.id)
        discountcode.code = token
        discountcode.usage_count = 1;
        discountcode.save
        result = {
          :code => 1,
          :discount_code => token,
          :discount_amount => discount_amount,
          :msg => message
        }
      end
    end
    render :json => result
  end
  def resend
    shop_domain = params[:shop_domain]
    shop = Shop.find_by(shopify_domain: shop_domain)
    if shop.nil?
      result = {
        :code => 0,
        :msg => "El dominio de Shopify no existe."
      }
      render :json => result
      return
    end

    auth_token = params[:auth_token]
    api_url = ENV['API_ENDPOINT_URL'] + '/users/generate_send_payment_token'
    api_header_key = ENV['API_HEADER_KEY'];
    headers = {}
    headers[api_header_key] = shop[:app_id_2transfair]
    headers[:Authorization] = auth_token
    query = { :transaction_type => 'payment' }
    response = HTTParty.post(api_url, :headers => headers, :query => query)
    if response.body.nil? || response.body.empty?
      result = { :code => 0, :msg => "Error de servidor interno." }
    else
      puts response.parsed_response
      result = { :code => 1, :msg => response.parsed_response['message'] }
    end
    render :json => result
  end
end