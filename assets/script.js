// COD Verifier Script - Enhanced with Razorpay Standard Checkout
(function($) {
    'use strict';

    // Global variables
    let otpTimer = 0;
    let otpTimerInterval = null;
    let isOTPVerified = false;
    let isTokenPaid = false;

    // Initialize when document is ready
    $(document).ready(function() {
        initializeCODVerifier();
    });

    function initializeCODVerifier() {
        // Check if COD is selected on page load
        checkCODSelection();
        
        // Monitor payment method changes
        $(document.body).on('change', 'input[name="payment_method"]', function() {
            checkCODSelection();
        });

        // Initialize event handlers
        initializeOTPHandlers();
        initializeTokenHandlers();
        
        // Monitor checkout form changes
        $(document.body).on('updated_checkout', function() {
            checkCODSelection();
        });
    }

    function checkCODSelection() {
        const selectedPaymentMethod = $('input[name="payment_method"]:checked').val();
        const wrapper = $('#cod-verifier-wrapper');
        
        if (selectedPaymentMethod === 'cod') {
            // Show verification box
            wrapper.attr('id', 'cod-verifier-wrapper-active').show();
            
            // Show warning message if not verified
            if (!isOTPVerified || !isTokenPaid) {
                showWarningMessage();
            }
        } else {
            // Hide verification box
            wrapper.attr('id', 'cod-verifier-wrapper').hide();
            hideWarningMessage();
        }
    }

    function showWarningMessage() {
        // Remove existing warning
        $('.cod-verification-warning').remove();
        
        // Create warning message
        const warningHtml = `
            <div class="cod-verification-warning">
                <div class="cod-warning-content">
                    <span class="cod-warning-icon">⚠️</span>
                    <span class="cod-warning-text">Please complete COD verification before placing order</span>
                </div>
            </div>
        `;
        
        // Insert warning after checkout actions
        $('.wc-block-checkout__actions_row, .woocommerce-checkout-review-order').after(warningHtml);
    }

    function hideWarningMessage() {
        $('.cod-verification-warning').remove();
    }

    // ===== OTP HANDLERS (DO NOT MODIFY) =====
    function initializeOTPHandlers() {
        if (codVerifier.enableOTP !== '1') return;

        // Country code change handler
        $('#cod_country_code').on('change', function() {
            updatePhoneHelperText();
            resetOTPForm();
        });

        // Phone input handler
        $('#cod_phone').on('input', function() {
            validatePhoneInput();
        });

        // Send OTP button handler
        $('#cod_send_otp').on('click', function() {
            sendOTP();
        });

        // OTP input handler
        $('#cod_otp').on('input', function() {
            const otp = $(this).val();
            $('#cod_verify_otp').prop('disabled', otp.length !== 6);
        });

        // Verify OTP button handler
        $('#cod_verify_otp').on('click', function() {
            verifyOTP();
        });

        // Initialize helper text
        updatePhoneHelperText();
    }

    function updatePhoneHelperText() {
        const countryCode = $('#cod_country_code').val();
        const helpText = $('#cod_phone_help_text');
        
        switch(countryCode) {
            case '+91':
                helpText.text('Enter 10-digit Indian mobile number (e.g., 7039940998)');
                break;
            case '+1':
                helpText.text('Enter 10-digit US phone number (e.g., 2125551234)');
                break;
            case '+44':
                helpText.text('Enter UK phone number (e.g., 7700900123)');
                break;
            default:
                helpText.text('Select country and enter phone number');
        }
    }

    function validatePhoneInput() {
        const countryCode = $('#cod_country_code').val();
        const phoneNumber = $('#cod_phone').val();
        const sendButton = $('#cod_send_otp');
        
        let isValid = false;
        
        switch(countryCode) {
            case '+91':
                isValid = /^[6-9]\d{9}$/.test(phoneNumber);
                break;
            case '+1':
                isValid = /^[2-9]\d{9}$/.test(phoneNumber);
                break;
            case '+44':
                isValid = /^7\d{9}$/.test(phoneNumber);
                break;
        }
        
        sendButton.prop('disabled', !isValid || otpTimer > 0);
    }

    function resetOTPForm() {
        $('#cod_phone').val('');
        $('#cod_otp').val('');
        $('#cod_send_otp').prop('disabled', true).text('Send OTP');
        $('#cod_verify_otp').prop('disabled', true);
        clearOTPTimer();
        hideOTPMessage();
    }

    function sendOTP() {
        const countryCode = $('#cod_country_code').val();
        const phoneNumber = $('#cod_phone').val();
        const fullPhone = countryCode + phoneNumber;
        
        const sendButton = $('#cod_send_otp');
        sendButton.prop('disabled', true).text('Sending...');
        
        $.ajax({
            url: codVerifier.ajaxUrl,
            type: 'POST',
            data: {
                action: 'cod_send_otp',
                nonce: codVerifier.nonce,
                phone: fullPhone,
                country_code: countryCode,
                phone_number: phoneNumber
            },
            success: function(response) {
                if (response.success) {
                    showOTPMessage(response.data.message, 'success');
                    startOTPTimer();
                    
                    // Show OTP in test mode
                    if (response.data.test_mode && response.data.otp) {
                        setTimeout(function() {
                            alert('TEST MODE - Your OTP is: ' + response.data.otp);
                        }, 500);
                    }
                } else {
                    showOTPMessage(response.data, 'error');
                    sendButton.prop('disabled', false).text('Send OTP');
                }
            },
            error: function() {
                showOTPMessage('Failed to send OTP. Please try again.', 'error');
                sendButton.prop('disabled', false).text('Send OTP');
            }
        });
    }

    function verifyOTP() {
        const otp = $('#cod_otp').val();
        const verifyButton = $('#cod_verify_otp');
        
        verifyButton.prop('disabled', true).text('Verifying...');
        
        $.ajax({
            url: codVerifier.ajaxUrl,
            type: 'POST',
            data: {
                action: 'cod_verify_otp',
                nonce: codVerifier.nonce,
                otp: otp
            },
            success: function(response) {
                if (response.success) {
                    isOTPVerified = true;
                    showOTPMessage(response.data, 'success');
                    updateOTPStatus('verified');
                    verifyButton.text('✓ Verified').addClass('verified');
                    
                    // Update form field for checkout validation
                    $('<input>').attr({
                        type: 'hidden',
                        name: 'cod_otp_verified',
                        value: '1'
                    }).appendTo('form.checkout');
                    
                    checkVerificationComplete();
                } else {
                    showOTPMessage(response.data, 'error');
                    verifyButton.prop('disabled', false).text('Verify');
                }
            },
            error: function() {
                showOTPMessage('OTP verification failed. Please try again.', 'error');
                verifyButton.prop('disabled', false).text('Verify');
            }
        });
    }

    function startOTPTimer() {
        otpTimer = parseInt(codVerifier.otpTimerDuration);
        const sendButton = $('#cod_send_otp');
        
        otpTimerInterval = setInterval(function() {
            otpTimer--;
            sendButton.text(`Resend (${otpTimer}s)`).removeClass('cod-btn-primary').addClass('cod-btn-timer-active');
            
            if (otpTimer <= 0) {
                clearOTPTimer();
                sendButton.prop('disabled', false).text('Resend OTP').removeClass('cod-btn-timer-active').addClass('cod-btn-primary');
                validatePhoneInput();
            }
        }, 1000);
    }

    function clearOTPTimer() {
        if (otpTimerInterval) {
            clearInterval(otpTimerInterval);
            otpTimerInterval = null;
        }
        otpTimer = 0;
    }

    function showOTPMessage(message, type) {
        const messageDiv = $('#cod_otp_message');
        messageDiv.removeClass('success error').addClass(type).text(message).show();
    }

    function hideOTPMessage() {
        $('#cod_otp_message').hide();
    }

    function updateOTPStatus(status) {
        const badge = $('#cod-otp-badge');
        badge.removeClass('pending verified').addClass(status);
        badge.text(status === 'verified' ? 'Verified' : 'Pending');
    }

    // ===== TOKEN PAYMENT HANDLERS (MODIFIED FOR RAZORPAY CHECKOUT) =====
    function initializeTokenHandlers() {
        if (codVerifier.enableToken !== '1') return;

        // Token payment button handler - MODIFIED for Razorpay Checkout
        $('#cod_pay_token').on('click', function(e) {
            e.preventDefault();
            initiateTokenPayment();
        });

        // Token confirmation checkbox handler
        $('#cod_token_confirmed').on('change', function() {
            if ($(this).is(':checked') && isTokenPaid) {
                updateTokenStatus('verified');
                
                // Update form field for checkout validation
                $('<input>').attr({
                    type: 'hidden',
                    name: 'cod_token_verified',
                    value: '1'
                }).appendTo('form.checkout');
                
                checkVerificationComplete();
            }
        });
    }

    // MODIFIED: Token payment initiation using Razorpay Standard Checkout
    function initiateTokenPayment() {
        const $button = $('#cod_pay_token');
        
        // Disable button and show processing state
        $button.prop('disabled', true).text('Processing Payment...');
        
        // Create Razorpay Order via AJAX
        $.ajax({
            url: codVerifier.ajaxUrl,
            type: 'POST',
            data: {
                action: 'cod_create_payment_link',
                nonce: codVerifier.nonce
            },
            dataType: 'json',
            success: function(response) {
                if (response.success) {
                    // Check if test mode
                    if (response.data.test_mode) {
                        handleTestModePayment(response.data);
                    } else {
                        // Initialize Razorpay Checkout with Order data
                        openRazorpayCheckout(response.data);
                    }
                } else {
                    alert(response.data);
                    $button.prop('disabled', false).text('Pay ₹1 Token');
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX error creating Razorpay Order:', error);
                alert('An error occurred while preparing payment. Please try again.');
                $button.prop('disabled', false).text('Pay ₹1 Token');
            }
        });
    }

    // Handle test mode payment simulation
    function handleTestModePayment(data) {
        // Show immediate success feedback
        displaySuccessAnimation();
        displayRefundMessage();
        
        // Simulate server verification after delay
        setTimeout(function() {
            isTokenPaid = true;
            updateFrontendStatus('success');
            enablePlaceOrderButton();
            
            // Auto-close popup after 5 seconds
            setTimeout(hidePaymentPopup, 5000);
        }, 1500);
    }

    // NEW: Open Razorpay Standard Checkout
    function openRazorpayCheckout(orderData) {
        // Check if Razorpay is loaded
        if (typeof Razorpay === 'undefined') {
            alert('Payment system not loaded. Please refresh the page and try again.');
            $('#cod_pay_token').prop('disabled', false).text('Pay ₹1 Token');
            return;
        }

        // Configure Razorpay Checkout options
        const options = {
            "key": orderData.key_id,
            "amount": orderData.amount,
            "currency": orderData.currency,
            "order_id": orderData.order_id,
            "name": "COD Token Payment",
            "description": "₹1 Token Payment for COD Verification",
            "image": "", // Add your logo URL if needed
            "handler": function(razorpay_response) {
                // SUCCESS CALLBACK - Payment completed client-side
                console.log('Razorpay Payment Successful (Client-side):', razorpay_response);
                
                // Immediate UI feedback
                displaySuccessAnimation();
                displayRefundMessage();
                
                // Send payment details to server for verification
                verifyPaymentOnServer(
                    razorpay_response.razorpay_payment_id,
                    razorpay_response.razorpay_order_id,
                    razorpay_response.razorpay_signature
                );
                
                // Auto-close popup after 5 seconds
                setTimeout(hidePaymentPopup, 5000);
            },
            "prefill": {
                "name": orderData.customer_name || "",
                "email": orderData.customer_email || "",
                "contact": orderData.customer_phone || ""
            },
            "notes": {
                "woo_order_id": codVerifier.wooOrderId
            },
            "theme": {
                "color": "#667eea"
            }
        };

        // Create Razorpay instance
        const rzp1 = new Razorpay(options);

        // Handle payment failure/cancellation
        rzp1.on('payment.failed', function(response) {
            console.error('Razorpay Payment Failed:', response);
            alert('Payment failed: ' + (response.error ? response.error.description : 'An unknown error occurred.'));
            $('#cod_pay_token').prop('disabled', false).text('Pay ₹1 Token');
            updateFrontendStatus('failed');
        });

        // Open Razorpay Checkout modal
        rzp1.open();
    }

    // NEW: Send payment details to server for verification
    function verifyPaymentOnServer(paymentId, orderId, signature) {
        console.log('Sending payment details to server for verification...');
        
        $.ajax({
            url: codVerifier.ajaxUrl,
            type: 'POST',
            data: {
                action: 'cod_verify_token_payment_server',
                nonce: codVerifier.nonce,
                payment_id: paymentId,
                order_id: orderId,
                signature: signature
            },
            dataType: 'json',
            success: function(response) {
                if (response.success) {
                    console.log('Server verification successful.');
                    
                    // Update frontend status and enable button
                    isTokenPaid = true;
                    updateFrontendStatus('success');
                    enablePlaceOrderButton();
                    
                } else {
                    console.error('Server verification failed:', response.data);
                    alert('Payment verification failed. Please contact support.');
                    updateFrontendStatus('failed');
                }
            },
            error: function(xhr, status, error) {
                console.error('Server verification AJAX error:', error);
                alert('An error occurred during payment verification. Please contact support.');
                updateFrontendStatus('failed');
            }
        });
    }

    // NEW: Display success animation
    function displaySuccessAnimation() {
        $('#token-payment-feedback').show();
        $('#success-animation').show();
        console.log('Success animation shown.');
    }

    // NEW: Display refund message
    function displayRefundMessage() {
        $('#refund-info-message').text('Your ₹1 token payment was successful. The amount will be refunded automatically within 24 hours.').show();
        console.log('Refund message shown.');
    }

    // NEW: Hide payment popup
    function hidePaymentPopup() {
        $('#cod-verification-template').hide();
        // Reset feedback elements for next use
        $('#token-payment-feedback').hide();
        $('#success-animation').hide();
        $('#refund-info-message').hide();
        console.log('Payment popup hidden.');
    }

    // NEW: Update frontend status
    function updateFrontendStatus(status) {
        updateTokenStatus(status);
        console.log('Frontend status updated to:', status);
    }

    // NEW: Enable Place Order button
    function enablePlaceOrderButton() {
        const $placeOrderButton = $('button[name="woocommerce_checkout_place_order"], #place_order');
        if ($placeOrderButton.length) {
            $placeOrderButton.prop('disabled', false);
            console.log('Place Order button enabled.');
        } else {
            console.warn('Could not find the Place Order button to enable.');
        }
    }

    function updateTokenStatus(status) {
        const badge = $('#cod-token-badge');
        badge.removeClass('pending verified success failed').addClass(status);
        
        switch(status) {
            case 'success':
            case 'verified':
                badge.text('Verified');
                break;
            case 'failed':
                badge.text('Failed');
                break;
            default:
                badge.text('Pending');
        }
    }

    function checkVerificationComplete() {
        const otpRequired = codVerifier.enableOTP === '1';
        const tokenRequired = codVerifier.enableToken === '1';
        
        const otpComplete = !otpRequired || isOTPVerified;
        const tokenComplete = !tokenRequired || isTokenPaid;
        
        if (otpComplete && tokenComplete) {
            hideWarningMessage();
            enablePlaceOrderButton();
        }
    }

    // QR Code generation (KEEP EXISTING FUNCTIONALITY)
    function generateQRCode(url) {
        const qrContainer = $('#cod-qr-code');
        if (qrContainer.length && typeof QRCode !== 'undefined') {
            qrContainer.empty();
            new QRCode(qrContainer[0], {
                text: url,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });
        }
    }

})(jQuery);