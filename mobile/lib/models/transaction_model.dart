class TransactionModel {
  final String id;
  final String userId;
  final String? jobId;
  final String? propertyId;
  final double amount;
  final String reference;
  final String status; // 'pending' | 'escrow_held' | 'released' | 'refunded' | 'failed'
  final String paymentMethod; // 'card' | 'bank_transfer' | 'ussd'
  final String type; // 'service_deposit' | 'escrow_deposit' | 'rent_deposit' | 'inspection_fee'
  final String title;
  final String description;
  final String createdAt;

  TransactionModel({
    required this.id,
    required this.userId,
    this.jobId,
    this.propertyId,
    required this.amount,
    required this.reference,
    required this.status,
    required this.paymentMethod,
    required this.type,
    required this.title,
    this.description = '',
    required this.createdAt,
  });

  factory TransactionModel.fromMap(Map<String, dynamic> map, String docId) {
    return TransactionModel(
      id: docId,
      userId: map['userId'] ?? '',
      jobId: map['jobId'],
      propertyId: map['propertyId'],
      amount: map['amount'] != null ? double.tryParse('${map['amount']}') ?? 0.0 : 0.0,
      reference: map['reference'] ?? '',
      status: map['status'] ?? 'pending',
      paymentMethod: map['paymentMethod'] ?? 'card',
      type: map['type'] ?? 'service_deposit',
      title: map['title'] ?? 'Transaction',
      description: map['description'] ?? '',
      createdAt: map['createdAt'] is String
          ? map['createdAt']
          : DateTime.now().toIso8601String(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      if (jobId != null) 'jobId': jobId,
      if (propertyId != null) 'propertyId': propertyId,
      'amount': amount,
      'reference': reference,
      'status': status,
      'paymentMethod': paymentMethod,
      'type': type,
      'title': title,
      'description': description,
      'createdAt': createdAt,
    };
  }
}
