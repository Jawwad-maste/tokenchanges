<?php
if (!defined('ABSPATH')) {
    exit;
}

$enable_otp = get_option('cod_verifier_enable_otp', '1');
$enable_token = get_option('cod_verifier_enable_token', '1');
$test_mode = get_option('cod_verifier_test_mode', '1');
$allowed_regions = get_option('cod_verifier_allowed_regions', 'india');
$otp_timer_duration = get_option('cod_verifier_otp_timer_duration', 30);
?>

<div id="cod-verifier-wrapper" style="display:none !important; margin: 20px 0; position: relative;">
    <div class="cod-verifier-container">
        <!-- Header -->
        <div class="cod-verifier-header">
            <div class="cod-header-content">
                <div class="cod-icon">🔐</div>
                <div class="cod-header-text">
                    <h3>COD Verification Required</h3>
                    <p>Complete verification to place your Cash on Delivery order</p>
                </div>
            </div>
            <?php if ($test_mode === '1'): ?>
            <div class="cod-test-badge">TEST MODE</div>
            <?php endif; ?>
        </div>
        
        <!-- Content -->
        <div class="cod-verifier-content">
            <?php if ($enable_otp === '1'): ?>
            <div class="cod-section" id="cod-verifier-otp-section">
                <div class="cod-section-header">
                    <span class="cod-section-icon">📱</span>
                    <h4>Phone Verification</h4>
                    <span class="cod-step-badge">Step 1</span>
                </div>
                
                <div class="cod-form-group">
                    <label for="cod_phone">Mobile Number</label>
                    <div class="cod-input-group cod-phone-input-group">
                        <!-- Country Code Dropdown -->
                        <select id="cod_country_code" name="cod_country_code" class="cod-country-select">
                            <?php if ($allowed_regions === 'global' || $allowed_regions === 'india'): ?>
                            <option value="+91" selected>🇮🇳 +91</option>
                            <?php endif; ?>
                            <?php if ($allowed_regions === 'global' || $allowed_regions === 'usa'): ?>
                            <option value="+1">🇺🇸 +1</option>
                            <?php endif; ?>
                            <?php if ($allowed_regions === 'global' || $allowed_regions === 'uk'): ?>
                            <option value="+44">🇬🇧 +44</option>
                            <?php endif; ?>
                        </select>
                        
                        <!-- Phone Number Input -->
                        <input type="tel" id="cod_phone" name="cod_phone" placeholder="Enter phone number" class="cod-input cod-phone-input">
                        
                        <!-- Send OTP Button -->
                        <button type="button" id="cod_send_otp" class="cod-btn cod-btn-primary cod-send-otp-btn">Send OTP</button>
                    </div>
                    <div class="cod-phone-help">
                        <small id="cod_phone_help_text">
                            <?php if ($allowed_regions === 'india'): ?>
                                Enter 10-digit Indian mobile number (e.g., 7039940998)
                            <?php elseif ($allowed_regions === 'usa'): ?>
                                Enter 10-digit US phone number (e.g., 2125551234)
                            <?php elseif ($allowed_regions === 'uk'): ?>
                                Enter UK phone number (e.g., 7700900123)
                            <?php else: ?>
                                Select country and enter phone number
                            <?php endif; ?>
                        </small>
                    </div>
                </div>
                
                <div class="cod-form-group">
                    <label for="cod_otp">Enter OTP</label>
                    <div class="cod-input-group">
                        <input type="text" id="cod_otp" name="cod_otp" placeholder="6-digit OTP" maxlength="6" class="cod-input">
                        <button type="button" id="cod_verify_otp" class="cod-btn cod-btn-success" disabled>Verify</button>
                    </div>
                </div>
                
                <div id="cod_otp_message" class="cod-message"></div>
            </div>
            <?php endif; ?>
            
            <?php if ($enable_token === '1'): ?>
            <div class="cod-section" id="cod-verifier-token-section">
                <div class="cod-section-header">
                    <span class="cod-section-icon">💳</span>
                    <h4>Token Payment</h4>
                    <span class="cod-step-badge">Step <?php echo ($enable_otp === '1') ? '2' : '1'; ?></span>
                </div>
                
                <div class="cod-token-info">
                    <p>Pay ₹1 token to confirm your order and prevent fake bookings</p>
                </div>
                
                <div class="cod-form-group">
                    <button type="button" id="cod_pay_token" class="cod-btn cod-btn-warning cod-btn-large">
                        Pay ₹1 Token
                    </button>
                </div>
                
                <!-- NEW: Container for payment feedback and animation -->
                <div id="token-payment-feedback" style="display: none; text-align: center; margin-top: 20px;">
                    <!-- Success Animation Element -->
                    <div id="success-animation" style="display: none;">
                        <!-- Attractive SVG Success Animation -->
                        <div style="position: relative; display: inline-block;">
                            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130.2 130.2" style="width: 100px; height: 100px; animation: successPulse 0.6s ease-in-out;">
                                <circle cx="65.1" cy="65.1" r="62.1" fill="none" stroke="#28a745" stroke-width="4" stroke-miterlimit="10" style="animation: drawCircle 0.6s ease-in-out;"/>
                                <polyline fill="none" stroke="#28a745" stroke-width="4" stroke-linecap="round" stroke-miterlimit="10" points="100.2,40.2 51.5,88.8 29.8,67.5" style="animation: drawCheck 0.3s ease-in-out 0.6s both;"/>
                            </svg>
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px; animation: sparkle 1s ease-in-out 0.9s;">✨</div>
                        </div>
                        <p style="color: #28a745; font-weight: bold; margin-top: 15px; font-size: 18px; animation: fadeInUp 0.5s ease-in-out 1.2s both;">Payment Successful!</p>
                    </div>
                    
                    <!-- Refund Information Message -->
                    <p id="refund-info-message" style="margin-top: 15px; font-size: 16px; color: #333; background: #e8f5e8; padding: 12px; border-radius: 8px; border-left: 4px solid #28a745; animation: fadeInUp 0.5s ease-in-out 1.5s both;"></p>
                </div>
                
                <div class="cod-checkbox-group">
                    <label class="cod-checkbox-label">
                        <input type="checkbox" id="cod_token_confirmed" name="cod_token_confirmed" value="1">
                        <span class="cod-checkmark"></span>
                        <span class="cod-checkbox-text">I confirm that I have completed the ₹1 token payment</span>
                    </label>
                </div>
                
                <div id="cod_token_message" class="cod-message"></div>
            </div>
            <?php endif; ?>
            
            <!-- Status Summary -->
            <div class="cod-status-summary">
                <h4>Verification Status</h4>
                <div class="cod-status-items">
                    <?php if ($enable_otp === '1'): ?>
                    <div class="cod-status-item" id="cod-otp-status">
                        <span class="cod-status-icon">📱</span>
                        <span class="cod-status-text">Phone Verification</span>
                        <span class="cod-status-badge pending" id="cod-otp-badge">Pending</span>
                    </div>
                    <?php endif; ?>
                    
                    <?php if ($enable_token === '1'): ?>
                    <div class="cod-status-item" id="cod-token-status">
                        <span class="cod-status-icon">💳</span>
                        <span class="cod-status-text">Token Payment</span>
                        <span class="cod-status-badge pending" id="cod-token-badge">Pending</span>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- CSS Animations for Success Feedback -->
<style>
@keyframes successPulse {
    0% { transform: scale(0.8); opacity: 0; }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); opacity: 1; }
}

@keyframes drawCircle {
    0% { stroke-dasharray: 0 400; }
    100% { stroke-dasharray: 400 400; }
}

@keyframes drawCheck {
    0% { stroke-dasharray: 0 100; }
    100% { stroke-dasharray: 100 100; }
}

@keyframes sparkle {
    0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
}

@keyframes fadeInUp {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
}

.cod-status-badge.success {
    background: #d1fae5;
    color: #065f46;
}

.cod-status-badge.failed {
    background: #fee2e2;
    color: #dc2626;
}
</style>

<!-- Hidden data for JavaScript -->
<script type="text/javascript">
window.codVerifierSettings = {
    allowedRegions: '<?php echo esc_js($allowed_regions); ?>',
    otpTimerDuration: <?php echo intval($otp_timer_duration); ?>,
    testMode: '<?php echo esc_js($test_mode); ?>'
};
</script>