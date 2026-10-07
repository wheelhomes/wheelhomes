import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme.dart';
import '../../core/payment_config.dart';
import '../../providers/auth_provider.dart';
import '../../providers/payment_provider.dart';
import '../../models/request_model.dart';
import 'payment_history_screen.dart';

class PaymentCheckoutScreen extends StatefulWidget {
  final ServiceRequestModel request;

  const PaymentCheckoutScreen({
    super.key,
    required this.request,
  });

  @override
  State<PaymentCheckoutScreen> createState() => _PaymentCheckoutScreenState();
}

class _PaymentCheckoutScreenState extends State<PaymentCheckoutScreen> {
  String _selectedMethod = 'card'; // 'card' | 'bank_transfer' | 'ussd'
  final _cardNumberController = TextEditingController(text: PaymentConfig.testCardSuccess['cardNumber']);
  final _expiryController = TextEditingController(text: PaymentConfig.testCardSuccess['expiry']);
  final _cvvController = TextEditingController(text: PaymentConfig.testCardSuccess['cvv']);
  final _cardHolderController = TextEditingController(text: 'OLUWASEUN ADEYEMI');

  @override
  void dispose() {
    _cardNumberController.dispose();
    _expiryController.dispose();
    _cvvController.dispose();
    _cardHolderController.dispose();
    super.dispose();
  }

  double get _baseAmount => widget.request.price ?? 15000.0;
  double get _escrowFee => (_baseAmount * 0.015).clamp(250.0, 2500.0);
  double get _totalAmount => _baseAmount + _escrowFee;

  void _handlePay() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final paymentProvider = Provider.of<PaymentProvider>(context, listen: false);

    final user = authProvider.user;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please log in to continue payment.')),
      );
      return;
    }

    final transaction = await paymentProvider.payEscrowDeposit(
      userId: user.uid,
      jobId: widget.request.id,
      amount: _totalAmount,
      title: '${widget.request.serviceType} Escrow Deposit',
      paymentMethod: _selectedMethod,
      description: 'Escrow payment secured for ${widget.request.serviceType}. Held in Wheelhomes Trust.',
    );

    if (!mounted) return;

    if (transaction != null) {
      _showSuccessDialog(transaction.reference);
    } else {
      final error = paymentProvider.errorMessage ?? 'Payment failed. Please try again.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error),
          backgroundColor: AppTheme.error,
        ),
      );
    }
  }

  void _showSuccessDialog(String reference) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppTheme.accent.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  LucideIcons.shieldCheck,
                  color: AppTheme.accent,
                  size: 40,
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Escrow Payment Secured! 🔒',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Your payment is now safely locked in Wheelhomes Escrow. The service provider has been notified to proceed.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: AppTheme.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.background,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Column(
                  children: [
                    const Text(
                      'PAYMENT REFERENCE',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textSecondary,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    SelectableText(
                      reference,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop(); // Close dialog
                    Navigator.of(context).pop(); // Return to previous screen
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text('Return to Requests', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final paymentProvider = Provider.of<PaymentProvider>(context);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Secure Checkout 🔒'),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.history, size: 20),
            tooltip: 'Payment History',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PaymentHistoryScreen()),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Escrow Guarantee Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5), // Emerald 50
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.accent.withValues(alpha: 0.4)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.accent.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.shieldCheck, color: AppTheme.accent, size: 20),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Wheelhomes Escrow Guarantee',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: Color(0xFF065F46), // Emerald 800
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Your money is held safely in escrow. Funds are ONLY released to the provider when you inspect the job and confirm satisfaction.',
                          style: TextStyle(
                            fontSize: 12,
                            color: Color(0xFF047857),
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (!PaymentConfig.isLiveMode) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB), // Amber 50
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber[300]!),
                ),
                child: Row(
                  children: [
                    Icon(LucideIcons.flaskConical, color: Colors.amber[900], size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Paystack Test Sandbox Active • Preloaded with test credentials',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.amber[900],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 24),

            // Service Summary Card
            const Text(
              'Service Summary',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        widget.request.serviceType,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          widget.request.status.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (widget.request.location['address'] != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(LucideIcons.mapPin, size: 14, color: AppTheme.textSecondary),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            '${widget.request.location['address']}',
                            style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 14),
                  const Divider(height: 1, color: AppTheme.border),
                  const SizedBox(height: 14),
                  _buildCostRow('Service Estimate', '₦${_baseAmount.toStringAsFixed(0)}'),
                  const SizedBox(height: 8),
                  _buildCostRow('Escrow Protection & Processing', '₦${_escrowFee.toStringAsFixed(0)}'),
                  const SizedBox(height: 10),
                  const Divider(height: 1, color: AppTheme.border),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total Deposit',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                      ),
                      Text(
                        '₦${_totalAmount.toStringAsFixed(0)}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Payment Method Selector
            const Text(
              'Select Payment Method',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildMethodOption('card', 'Card', LucideIcons.creditCard),
                const SizedBox(width: 10),
                _buildMethodOption('bank_transfer', 'Bank Transfer', LucideIcons.landmark),
                const SizedBox(width: 10),
                _buildMethodOption('ussd', 'USSD', LucideIcons.smartphone),
              ],
            ),
            const SizedBox(height: 16),

            // Payment Method Specific Input Container
            if (_selectedMethod == 'card') _buildCardForm(),
            if (_selectedMethod == 'bank_transfer') _buildBankTransferInfo(),
            if (_selectedMethod == 'ussd') _buildUssdInfo(),

            const SizedBox(height: 32),

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: paymentProvider.isLoading ? null : _handlePay,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  disabledBackgroundColor: AppTheme.primary.withValues(alpha: 0.6),
                ),
                child: paymentProvider.isLoading
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(LucideIcons.lock, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            'Pay ₦${_totalAmount.toStringAsFixed(0)} into Escrow',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 12),
            const Center(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.lock, size: 12, color: AppTheme.textSecondary),
                  SizedBox(width: 4),
                  Text(
                    '256-Bit SSL Encrypted • Powered by Paystack',
                    style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMethodOption(String methodKey, String label, IconData icon) {
    final isSelected = _selectedMethod == methodKey;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedMethod = methodKey),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.primary.withValues(alpha: 0.08) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? AppTheme.primary : AppTheme.border,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                color: isSelected ? AppTheme.primary : AppTheme.textSecondary,
                size: 22,
              ),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected ? AppTheme.primary : AppTheme.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCostRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
      ],
    );
  }

  Widget _buildCardForm() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Card Details',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.blue[50],
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('VISA', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blue)),
                  ),
                  const SizedBox(width: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.red[50],
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('MC', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.red)),
                  ),
                  const SizedBox(width: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.teal[50],
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('VERVE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.teal)),
                  ),
                ],
              ),
            ],
          ),
          if (!PaymentConfig.isLiveMode) ...[
            const SizedBox(height: 6),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () {
                  setState(() {
                    _cardNumberController.text = PaymentConfig.testCardSuccess['cardNumber']!;
                    _expiryController.text = PaymentConfig.testCardSuccess['expiry']!;
                    _cvvController.text = PaymentConfig.testCardSuccess['cvv']!;
                  });
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Auto-filled Paystack Test Card (Always Succeeds) 💳'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
                icon: const Icon(LucideIcons.sparkles, size: 14),
                label: const Text('Fill Paystack Test Card', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                style: TextButton.styleFrom(
                  foregroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  visualDensity: VisualDensity.compact,
                ),
              ),
            ),
          ],
          const SizedBox(height: 8),
          TextFormField(
            controller: _cardNumberController,
            decoration: const InputDecoration(
              labelText: 'Card Number',
              prefixIcon: Icon(LucideIcons.creditCard, size: 18),
            ),
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _expiryController,
                  decoration: const InputDecoration(
                    labelText: 'MM / YY',
                  ),
                  keyboardType: TextInputType.datetime,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextFormField(
                  controller: _cvvController,
                  decoration: const InputDecoration(
                    labelText: 'CVV',
                    suffixIcon: Icon(LucideIcons.helpCircle, size: 16),
                  ),
                  obscureText: true,
                  keyboardType: TextInputType.number,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          TextFormField(
            controller: _cardHolderController,
            decoration: const InputDecoration(
              labelText: 'Cardholder Full Name',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBankTransferInfo() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Transfer to Dedicated Escrow Account',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
          const SizedBox(height: 8),
          const Text(
            'Transfer exact amount. Your payment will be recognized instantly and credited to escrow.',
            style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 14),
          _buildBankDetail('Bank Name', 'Providus Bank / Paystack Escrow'),
          _buildBankDetail('Account Number', '9928341029'),
          _buildBankDetail('Beneficiary', 'Wheelhomes Technologies Ltd - Escrow'),
          _buildBankDetail('Amount', '₦${_totalAmount.toStringAsFixed(0)}'),
        ],
      ),
    );
  }

  Widget _buildBankDetail(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
        ],
      ),
    );
  }

  Widget _buildUssdInfo() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Select Bank USSD Code',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
          SizedBox(height: 8),
          Text(
            'Dial the USSD shortcode on your registered bank mobile phone to complete payment into escrow:',
            style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
          ),
          SizedBox(height: 12),
          Text('• GTBank: *737*2*Amount*0003#', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
          SizedBox(height: 6),
          Text('• Zenith Bank: *966*000*Amount#', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
          SizedBox(height: 6),
          Text('• Access Bank: *901*000*Amount#', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
          SizedBox(height: 6),
          Text('• UBA: *919*00*Amount#', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
