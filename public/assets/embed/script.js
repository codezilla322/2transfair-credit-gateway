window.twotransfair = window.twotransfair || {};
twotransfair.server_url = 'https://3b209148.ngrok.io/api';
(function($){
  $.fn.twotransfairModal = function(msg_modal = null) {
    var $this = this;
    var $msg_modal = msg_modal;
    $(this).find('.modal-dismiss, .modal-close').click(function() {
      $this.hideModal();
      $('.modal-overlay').hide();
    });
    $(this).find('.modal-back').click(function() {
      $this.hideModal();
      if(twotransfair.step == 1)
        twotransfair.ajax_step_1.showModal();
      else if(twotransfair.step == 2)
        twotransfair.ajax_step_2.showModal();
    });
    this.showModal = function() {
      $(this).css('display', 'flex');
    }
    this.hideModal = function() {
      $(this).hide();
    };
    this.showMsg = function(msg) {
      $(this).find('.modal-msg').html(msg).show();
    };
    this.hideMsg = function() {
      $(this).find('.modal-msg').hide();
    };
    this.showMsgModal = function(msg) {
      this.hideModal();
      $msg_modal.find('#twotransfair_failed_msg').html(msg);
      $msg_modal.showModal();
    };
    this.sendAjax = function(request, step_next) {
      this.hideModal();
      this.hideMsg();
      $.ajax({
        method: 'post',
        dataType: 'json',
        crossDomain: true,
        url: request.url,
        data: request.data,
        success: function(result) {
          if(result.code == 1) {
            if(twotransfair.step == 1) {
              $('#twotransfair_phone_number').html(result.phone_number);
              twotransfair.total_value = result.total_value;
              var total_value = parseFloat(result.total_value).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
              $('#twotransfair_total_value').html(total_value);
              $('#twotransfair_policy_url').attr('href', result.url);
              result.terms.forEach(term => {
                $('#twotransfair_terms').append($('<option></option>').attr('value', term.id).text(term.name)); 
              });
              twotransfair.step = 2;
            } else if(twotransfair.step == 2) {
              var discount_amount = parseFloat(result.discount_amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
              $('#twotransfair_discount_amount').html(discount_amount);
              twotransfair.discount_amount = result.discount_amount;
              twotransfair.discount_code = result.discount_code;
              $('#twotransfair_success_msg').html(result.msg);
              localStorage.setItem('twotransfair-discount-code', twotransfair.discount_code);
              localStorage.setItem('twotransfair-checkout-token', twotransfair.checkout_token);

              // twotransfair.access_token = result.access_token;
              // const shopify_client = ShopifyBuy.buildClient({
              //   domain: twotransfair.shop_domain,
              //   storefrontAccessToken: twotransfair.access_token
              // });
              // var checkout_gid = btoa('gid://shopify/Checkout/' + window.Shopify.Checkout.token);
              // shopify_client.checkout.addDiscount(checkout_query, twotransfair.discount_code);
            }
            step_next.showModal();
          } else {
            $this.showMsgModal(result.msg);
          }
        },
        error: function() {
          $this.showMsg('Error de servidor interno');
          $this.showModal();
        }
      });
    };
    return this;
  }
  var isValidEmail = function(email) {
    var regExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(regExp.test(String(email).toLowerCase()))
      return true;
    return false;
  }
  var isValidCode = function(code) {
    if(/^\d+$/.test(code))
      return true;
    return false;
  }
  var applyDiscount = function(discount_code) {
    var url = new URL(window.location.href);
    url.searchParams.append('discount', discount_code);
    window.location.href = url;
  }
  var getDiscountFromUrl = function() {
    var url = new URL(window.location.href);
    var discount_code = url.searchParams.get("discount");
    return discount_code;
  }
  var checkDiscount = function() {
    var checkout_token = localStorage.getItem('twotransfair-checkout-token');
    var saved_discount_code = localStorage.getItem('twotransfair-discount-code');
    var applied_discount_code = getDiscountFromUrl();
    if(checkout_token == twotransfair.checkout_token && saved_discount_code && !applied_discount_code) {
      applyDiscount(saved_discount_code);
      return;
    }
    if(Shopify.Checkout.step == 'shipping_method') {
      if(!applied_discount_code || applied_discount_code != saved_discount_code) {
        $('#twotransfair_modals_wrapper').show();
      } else {
        $('form.edit_checkout .step__footer button[type=submit] span').html('Terminar');
        $('form.edit_checkout').on('submit', function(e) {
          e.preventDefault();
          window.location.href = 'https://' + twotransfair.shop_domain;
        });
        return;
      }
      $.ajax({
        type: 'GET',
        url: 'http://' + twotransfair.shop_domain + '/cart.json',
        dataType: 'jsonp',
        success: function(cart) { 
          twotransfair.cart_token = cart.token;
        }
      });
    }
  }
  $(document).ready(function() {
    var msg_modal = $('#twotransfair_msg_modal').twotransfairModal();
    var step_1 = $('#twotransfair_step1_modal').twotransfairModal(msg_modal);
    var step_2 = $('#twotransfair_step2_modal').twotransfairModal(msg_modal);
    twotransfair.ajax_step_1 = step_2;
    var step_3 = $('#twotransfair_step3_modal').twotransfairModal(msg_modal);
    twotransfair.ajax_step_2 = step_3;
    var step_4 = $('#twotransfair_step4_modal').twotransfairModal(msg_modal);
    var step_5 = $('#twotransfair_step5_modal').twotransfairModal(msg_modal);
    step_1.showModal();
    $('#twotransfair_step1_next').click(function() {
      step_1.hideModal();
      step_2.showModal();
    });
    $('#twotransfair_step2_next').click(function() {
      var email = $('#twotransfair_email').val();
      if( !isValidEmail(email) || email.length < 3) {
        step_2.showMsg('Email inválido');
        return;
      }
      var password = $('#twotransfair_password').val();
      if(password.length < 1) {
        step_2.showMsg('Contraseña inválido');
        return;
      }
      twotransfair.step = 1;
      step_2.sendAjax({
        url: twotransfair.server_url + '/login',
        data: {
          email: email,
          password: password,
          cart_id: twotransfair.cart_token,
          shop_domain: twotransfair.shop_domain
        }
      }, step_3);
    });
    $('#twotransfair_step3_next').click(function() {
      if(!($('#twotransfair_agree').prop('checked'))) {
        step_3.showMsg('Acepte los términos de crédito para continuar');
        return;
      }
      var payment_code = $('#twotransfair_payment_code').val();
      if(!isValidCode(payment_code) || payment_code.length != 6) {
        step_3.showMsg('Código inválido');
        return;
      }
      step_3.hideModal();
      step_3.hideMsg();
      step_4.showModal();
    });
    $('#twotransfair_step4_next').click(function() {
      var email = $('#twotransfair_email').val();
      var payment_code = $('#twotransfair_payment_code').val();
      var value = twotransfair.total_value;
      var terms = $('#twotransfair_terms').val();
      step_4.sendAjax({
        url: twotransfair.server_url + '/verify',
        data: {
          email: email,
          payment_code: payment_code,
          reference_code: twotransfair.cart_token,
          value: value,
          terms: terms,
          shop_domain: twotransfair.shop_domain,
        }
      }, step_5);
    });
    $('#twotransfair_step5_finish').click(function() {
      applyDiscount(twotransfair.discount_code);
    });
    twotransfair.shop_domain = window.Shopify.Checkout.apiHost;
    twotransfair.checkout_token = window.Shopify.Checkout.token;
    checkDiscount();
  });
})(jQuery);
