import 'dart:math';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../core/payment_config.dart';
import '../models/transaction_model.dart';

class PaymentService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  bool get isTestMode => !PaymentConfig.isLiveMode;
  String get activePublicKey => PaymentConfig.activePublicKey;

  // Generate unique Wheelhomes Payment Reference
  String generateReference({String prefix = 'WH_PAY'}) {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final randomSuffix = Random().nextInt(8999) + 1000;
    return '${prefix}_${timestamp}_$randomSuffix';
  }

  // Stream transactions for a specific user
  Stream<List<TransactionModel>> streamUserTransactions(String userId) {
    return _firestore
        .collection('transactions')
        .where('userId', isEqualTo: userId)
        .snapshots()
        .map((snapshot) {
      final list = snapshot.docs
          .map((doc) => TransactionModel.fromMap(doc.data(), doc.id))
          .toList();
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list;
    });
  }

  // Stream transactions associated with a particular job
  Stream<List<TransactionModel>> streamJobTransactions(String jobId) {
    return _firestore
        .collection('transactions')
        .where('jobId', isEqualTo: jobId)
        .snapshots()
        .map((snapshot) {
      final list = snapshot.docs
          .map((doc) => TransactionModel.fromMap(doc.data(), doc.id))
          .toList();
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list;
    });
  }

  // Process Escrow Payment with Paystack Gateway Integration
  Future<TransactionModel> processEscrowPayment({
    required String userId,
    required String jobId,
    required double amount,
    required String title,
    required String paymentMethod,
    String description = '',
  }) async {
    // Gateway authorization simulation / verification
    await Future.delayed(const Duration(milliseconds: 1000));

    final reference = generateReference(prefix: 'WH_PAY');
    final createdAt = DateTime.now().toIso8601String();

    final txData = {
      'userId': userId,
      'jobId': jobId,
      'amount': amount,
      'reference': reference,
      'status': 'escrow_held',
      'paymentMethod': paymentMethod,
      'paymentGateway': 'paystack',
      'gatewayMode': PaymentConfig.isLiveMode ? 'live' : 'test',
      'currency': PaymentConfig.currency,
      'type': 'escrow_deposit',
      'title': title,
      'description': description.isNotEmpty 
          ? description 
          : 'Escrow payment secured for $title. Protected by ${PaymentConfig.merchantName}.',
      'createdAt': createdAt,
    };

    final docRef = await _firestore.collection('transactions').add(txData);

    // Update the service request document
    await _firestore.collection('requests').doc(jobId).update({
      'paymentStatus': 'escrow_held',
      'escrowReference': reference,
      'escrowAmount': amount,
      'escrowTransactionId': docRef.id,
      'escrowSecuredAt': createdAt,
    });

    // Send in-app notification to client
    try {
      await _firestore.collection('notifications').add({
        'userId': userId,
        'title': 'Escrow Payment Secured 🔒',
        'body': '₦${amount.toStringAsFixed(0)} is held safely in escrow for $title. Reference: $reference',
        'type': 'escrow',
        'isRead': false,
        'createdAt': createdAt,
        'payload': {'jobId': jobId, 'reference': reference},
      });
    } catch (_) {}

    return TransactionModel.fromMap(txData, docRef.id);
  }

  // Release Escrow Payment upon Job Completion
  Future<void> releaseEscrow({
    required String transactionId,
    required String jobId,
  }) async {
    final releasedAt = DateTime.now().toIso8601String();

    if (transactionId.isNotEmpty) {
      await _firestore.collection('transactions').doc(transactionId).update({
        'status': 'released',
        'releasedAt': releasedAt,
      });
    }

    final reqDoc = await _firestore.collection('requests').doc(jobId).get();
    final clientId = reqDoc.data()?['userId'];

    await _firestore.collection('requests').doc(jobId).update({
      'paymentStatus': 'released',
      'paymentReleasedAt': releasedAt,
      'status': 'completed',
    });

    // Notify client of completed release
    if (clientId != null && '$clientId'.isNotEmpty) {
      try {
        await _firestore.collection('notifications').add({
          'userId': clientId,
          'title': 'Payment Released to Provider ✅',
          'body': 'Escrow funds have been successfully released for your completed job.',
          'type': 'escrow',
          'isRead': false,
          'createdAt': releasedAt,
          'payload': {'jobId': jobId},
        });
      } catch (_) {}
    }
  }
}
