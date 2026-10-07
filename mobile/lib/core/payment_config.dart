class PaymentConfig {
  // Paystack Public Keys
  // Switch to your pk_live_... key when ready for public production
  static const String testPublicKey = 'pk_test_wheelhomes_sandbox_key';
  static const String livePublicKey = 'pk_live_wheelhomes_prod_key';

  // Toggle this boolean to switch between Test Sandbox and Live Production
  static const bool isLiveMode = false;

  // Active public key depending on mode
  static String get activePublicKey => isLiveMode ? livePublicKey : testPublicKey;

  // Currency and Business Details
  static const String currency = 'NGN'; // Nigerian Naira
  static const String merchantName = 'Wheelhomes Technologies Ltd';
  static const String escrowGuaranteeNote = 
      'Wheelhomes Escrow Protection Guarantee: Funds are held securely until you confirm job completion.';

  // Standard Paystack Test Cards for testing
  static const Map<String, String> testCardSuccess = {
    'cardNumber': '4084 0840 8408 4084',
    'expiry': '12/28',
    'cvv': '408',
    'pin': '1234',
    'otp': '123456',
  };
}
