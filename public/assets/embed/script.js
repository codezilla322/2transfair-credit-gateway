window.twotransfair = window.twotransfair || {};
twotransfair.server_url = 'https://shopifyst.2transfair.com/api';
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
      if(twotransfair.step == 1) {
        twotransfair.ajax_step_1.showModal();
      } else if(twotransfair.step == 2) {
        twotransfair.ajax_step_2.showModal();
        $('#twotransfair_code_sent').addClass('modal-hidden');
      }
    });
    this.showModal = function() {
      $(this).removeClass('modal-hidden').css('display', 'flex');
    }
    this.hideModal = function() {
      $(this).addClass('modal-hidden');
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
              twotransfair.auth_token = result.auth_token;
              $('#twotransfair_phone_number').html(result.phone_number);
              twotransfair.total_value = result.total_value;
              var total_value = parseFloat(result.total_value).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
              $('#twotransfair_total_value').html(total_value);
              twotransfair.terms_url = result.url;
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
            }
            step_next.showModal();
          } else {
            $this.showMsgModal(result.msg);
            if(twotransfair.step == 2)
              $('#twotransfair_resend_code').removeClass('modal-hidden');
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
        $('div.main form.edit_checkout .step__footer button[type=submit] span').html('Terminar');
        $('div.main form.edit_checkout').on('submit', function(e) {
          e.preventDefault();
          $('div.tags-list form.edit_checkout button[type=submit]').click();
          $.ajax({
            method: 'post',
            crossDomain: true,
            url: twotransfair.server_url + '/reset',
            data: {
              discount_code: applied_discount_code,
              shop_domain: twotransfair.shop_domain
            }
          });
          localStorage.removeItem('twotransfair-checkout-token');
          localStorage.removeItem('twotransfair-discount-code');
          $.ajax({
            method: 'get',
            url: 'http://' + twotransfair.shop_domain + '/cart/clear.json',
            dataType: 'jsonp',
            success: function(cart) {
              window.location.href = 'https://' + twotransfair.shop_domain;
            }
          });
        });
        return;
      }
      $.ajax({
        method: 'get',
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
          cart_token: twotransfair.cart_token,
          checkout_token: twotransfair.checkout_token,
          shop_domain: twotransfair.shop_domain
        }
      }, step_3);
    });
    $('#twotransfair_step3_next').click(function() {
      if(twotransfair.terms_accepted == 0) {
        step_3.showMsgModal('Aún no has leído y aceptado las condiciones del crédito');
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
          checkout_token: twotransfair.checkout_token,
          value: value,
          terms: terms,
          shop_domain: twotransfair.shop_domain
        }
      }, step_5);
    });
    $('#twotransfair_step5_finish').click(function() {
      applyDiscount(twotransfair.discount_code);
    });
    $('#twotransfair_terms').change(function() {
      twotransfair.terms_accepted = 0;
      $('#twotransfair_terms_modal .modal-back').addClass('modal-hidden');
    });
    $('#twotransfair_terms_url').click(function() {
      var value = twotransfair.total_value;
      var terms = $('#twotransfair_terms').val();
      $.ajax({
        method: 'get',
        crossDomain: true,
        url: twotransfair.terms_url + '?cuota=' + terms + '&value=' + value,
        success: function(result) {
          $('#twotransfair_terms_content').html(result);
          $('#twotransfair_terms_modal').removeClass('modal-hidden');
          step_3.hideModal();
        }
      });
    });
    $('#twotransfair_terms_content').scroll(function() {
      if(this.scrollTop === (this.scrollHeight - this.offsetHeight))
        $('#twotransfair_terms_modal .modal-back').removeClass('modal-hidden');
    });
    $('#twotransfair_terms_modal .modal-back').click(function() {
      twotransfair.terms_accepted = 1;
      $('#twotransfair_terms_modal').addClass('modal-hidden');
      step_3.showModal();
    });
    $('#twotransfair_resend_code').click(function() {
      $('#twotransfair_resend_code').addClass('modal-hidden');
      $.ajax({
        method: 'post',
        dataType: 'json',
        crossDomain: true,
        url: twotransfair.server_url + '/resend',
        data: {
          auth_token: twotransfair.auth_token,
          shop_domain: twotransfair.shop_domain
        },
        success: function(result) {
          if(result.code == 1) {
            $('#twotransfair_code_sent').html(result.msg);
            $('#twotransfair_code_sent').removeClass('modal-hidden');
          } else {
            $('#twotransfair_resend_code').removeClass('modal-hidden');
            $('#twotransfair_failed_msg').html(result.msg);
          }
        },
        error: function() {
          $('#twotransfair_failed_msg').html('Error de servidor interno');
          $('#twotransfair_resend_code').removeClass('modal-hidden');
        }
      });
    });
    twotransfair.shop_domain = window.Shopify.Checkout.apiHost;
    twotransfair.checkout_token = window.Shopify.Checkout.token;
    twotransfair.terms_accepted = 0;
    checkDiscount();
  });
})(jQuery);
