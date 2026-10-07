import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/transaction_model.dart';
import '../services/payment_service.dart';

class PaymentProvider extends ChangeNotifier {
  final PaymentService _paymentService = PaymentService();

  List<TransactionModel> _transactions = [];
  bool _isLoading = false;
  String? _errorMessage;
  StreamSubscription<List<TransactionModel>>? _txSubscription;

  List<TransactionModel> get transactions => _transactions;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  void listenToUserTransactions(String userId) {
    _txSubscription?.cancel();
    _txSubscription = _paymentService.streamUserTransactions(userId).listen(
      (txList) {
        _transactions = txList;
        notifyListeners();
      },
      onError: (e) {
        debugPrint('Error streaming transactions: $e');
      },
    );
  }

  Future<TransactionModel?> payEscrowDeposit({
    required String userId,
    required String jobId,
    required double amount,
    required String title,
    required String paymentMethod,
    String description = '',
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final transaction = await _paymentService.processEscrowPayment(
        userId: userId,
        jobId: jobId,
        amount: amount,
        title: title,
        paymentMethod: paymentMethod,
        description: description,
      );
      _isLoading = false;
      notifyListeners();
      return transaction;
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<bool> releaseEscrowPayment({
    required String transactionId,
    required String jobId,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _paymentService.releaseEscrow(
        transactionId: transactionId,
        jobId: jobId,
      );
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  @override
  void dispose() {
    _txSubscription?.cancel();
    super.dispose();
  }
}
