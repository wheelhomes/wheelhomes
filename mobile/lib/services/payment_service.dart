import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/payment_config.dart';
import '../models/transaction_model.dart';

/// Escrow payments are created, verified and released exclusively on the
/// server (Cloud Functions + Paystack webhook). The client never writes
/// transaction or escrow data directly and never handles card details.
class PaymentService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  bool get isTestMode => !PaymentConfig.isLiveMode;

  // Stream transactions for a specific user (read-only)
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

  // Stream transactions associated with a particular job (read-only)
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

  /// Starts a Paystack checkout for [jobId]. The amount is computed on the
  /// server from the job document. Opens Paystack's hosted page and waits
  /// until the webhook confirms the payment (status -> escrow_held).
  Future<TransactionModel> processEscrowPayment({
    required String jobId,
    Duration timeout = const Duration(minutes: 10),
  }) async {
    final result = await _functions
        .httpsCallable('initializePayment')
        .call<Map<String, dynamic>>({'jobId': jobId});

    final data = Map<String, dynamic>.from(result.data);
    final url = data['authorizationUrl'] as String?;
    final reference = data['reference'] as String?;
    if (url == null || reference == null) {
      throw Exception('Could not start payment. Please try again.');
    }

    final uri = Uri.parse(url);
    if (uri.scheme != 'https' || !uri.host.endsWith('paystack.com')) {
      throw Exception('Unexpected payment URL.');
    }
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched) throw Exception('Could not open the Paystack checkout page.');

    // Wait for the server-verified webhook to mark the transaction.
    final snap = await _firestore
        .collection('transactions')
        .doc(reference)
        .snapshots()
        .firstWhere((s) {
          final status = s.data()?['status'];
          return status == 'escrow_held' || status == 'failed';
        })
        .timeout(timeout);

    final txData = snap.data()!;
    if (txData['status'] != 'escrow_held') {
      throw Exception('Payment could not be verified.');
    }
    return TransactionModel.fromMap(txData, snap.id);
  }

  /// Releases escrow for a completed job (server-side authorization).
  Future<void> releaseEscrow({required String jobId}) async {
    await _functions.httpsCallable('releaseEscrow').call({'jobId': jobId});
  }
}
