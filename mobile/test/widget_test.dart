// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:wheelhomes_mobile/models/request_model.dart';
import 'package:wheelhomes_mobile/models/chat_model.dart';
import 'package:wheelhomes_mobile/models/property_model.dart';
import 'package:wheelhomes_mobile/models/transaction_model.dart';
import 'package:wheelhomes_mobile/models/notification_model.dart';
import 'package:wheelhomes_mobile/models/user_model.dart';

void main() {
  test('ServiceRequestModel serialization includes images and paymentStatus', () {
    final model = ServiceRequestModel(
      id: 'req_123',
      userId: 'user_456',
      serviceType: 'Plumbing',
      description: 'Leaking pipe under kitchen sink',
      location: {'address': '12 Marina Road, Lagos'},
      price: 25000,
      status: 'pending',
      createdAt: '2026-09-16T10:00:00Z',
      images: [
        'https://storage.googleapis.com/test1.jpg',
        'https://storage.googleapis.com/test2.jpg',
      ],
      paymentStatus: 'escrow_held',
    );

    final map = model.toMap();
    expect(map['images'], hasLength(2));
    expect(map['serviceType'], 'Plumbing');
    expect(map['paymentStatus'], 'escrow_held');

    final reconstructed = ServiceRequestModel.fromMap(map, 'req_123');
    expect(reconstructed.id, 'req_123');
    expect(reconstructed.images.length, 2);
    expect(reconstructed.images.first, 'https://storage.googleapis.com/test1.jpg');
    expect(reconstructed.paymentStatus, 'escrow_held');
  });

  test('ChatMessage fromMap parses date and message metadata correctly', () {
    final map = {
      'text': 'Hello agent, is this apartment still available?',
      'senderId': 'client_01',
      'senderName': 'Ada Lovelace',
      'role': 'user',
      'createdAt': '2026-09-16T10:30:00Z',
    };

    final msg = ChatMessage.fromMap(map, 'msg_001');
    expect(msg.id, 'msg_001');
    expect(msg.text, 'Hello agent, is this apartment still available?');
    expect(msg.senderName, 'Ada Lovelace');
    expect(msg.role, 'user');
    expect(msg.createdAt.year, 2026);
  });

  test('ChatConversation fromMap correctly handles participant details', () {
    final map = {
      'title': 'Luxury Lekki Duplex',
      'propertyId': 'prop_999',
      'participants': ['client_01', 'agent_42'],
      'participantNames': {'client_01': 'Ada Lovelace', 'agent_42': 'Tunde Agent'},
      'lastMessage': 'Yes, inspections are open tomorrow.',
      'updatedAt': '2026-09-16T10:35:00Z',
    };

    final convo = ChatConversation.fromMap(map, 'chat_888');
    expect(convo.id, 'chat_888');
    expect(convo.title, 'Luxury Lekki Duplex');
    expect(convo.participants.length, 2);
    expect(convo.participantNames['agent_42'], 'Tunde Agent');
    expect(convo.lastMessage, 'Yes, inspections are open tomorrow.');
  });

  test('PropertyModel serialization and deserialization work correctly', () {
    final model = PropertyModel(
      id: 'prop_007',
      title: 'Modern 3-Bedroom Apartment in Victoria Island',
      price: '₦85,000,000',
      address: 'Ahmadu Bello Way, VI, Lagos',
      beds: 3,
      baths: 3,
      sqft: 1800,
      type: 'Apartment',
      status: 'For Sale',
      image: 'https://images.unsplash.com/prop.jpg',
      agentName: 'Emeka Okonkwo',
    );

    final map = model.toMap();
    expect(map['title'], 'Modern 3-Bedroom Apartment in Victoria Island');
    expect(map['price'], '₦85,000,000');
    expect(map['beds'], 3);

    final reconstructed = PropertyModel.fromMap(map, 'prop_007');
    expect(reconstructed.id, 'prop_007');
    expect(reconstructed.beds, 3);
    expect(reconstructed.type, 'Apartment');
  });

  test('TransactionModel handles escrow attributes and serialization correctly', () {
    final tx = TransactionModel(
      id: 'tx_555',
      userId: 'user_99',
      jobId: 'req_123',
      amount: 25375.0,
      reference: 'WH_ESCROW_1726483921_4910',
      status: 'escrow_held',
      paymentMethod: 'card',
      type: 'escrow_deposit',
      title: 'Plumbing Escrow Deposit',
      description: 'Funds secured in Wheelhomes Escrow',
      createdAt: '2026-09-16T11:00:00Z',
    );

    final map = tx.toMap();
    expect(map['userId'], 'user_99');
    expect(map['jobId'], 'req_123');
    expect(map['amount'], 25375.0);
    expect(map['status'], 'escrow_held');
    expect(map['reference'], startsWith('WH_ESCROW_'));

    final reconstructed = TransactionModel.fromMap(map, 'tx_555');
    expect(reconstructed.id, 'tx_555');
    expect(reconstructed.amount, 25375.0);
    expect(reconstructed.paymentMethod, 'card');
    expect(reconstructed.status, 'escrow_held');
  });

  test('NotificationModel serialization and unread status handle correctly', () {
    final notif = NotificationModel(
      id: 'notif_101',
      userId: 'user_456',
      title: 'Escrow Payment Secured 🔒',
      body: '₦25,000 has been held safely in escrow.',
      type: 'escrow',
      isRead: false,
      createdAt: '2026-09-16T11:00:00Z',
      payload: {'jobId': 'job_77'},
    );

    final map = notif.toMap();
    expect(map['title'], 'Escrow Payment Secured 🔒');
    expect(map['type'], 'escrow');
    expect(map['isRead'], false);
    expect(map['payload']['jobId'], 'job_77');

    final reconstructed = NotificationModel.fromMap(map, 'notif_101');
    expect(reconstructed.id, 'notif_101');
    expect(reconstructed.isRead, false);
    expect(reconstructed.title, 'Escrow Payment Secured 🔒');

    final updated = reconstructed.copyWith(isRead: true);
    expect(updated.isRead, true);
    expect(updated.id, 'notif_101');
  });

  test('UserProfile handles KYC verification attributes and getters correctly', () {
    final unverifiedUser = UserProfile(
      uid: 'user_artisan_1',
      email: 'artisan@wheelhomes.com',
      fullName: 'Babatunde Electrician',
      phone: '+234 802 345 6789',
      role: 'service_provider',
      status: 'unverified',
      createdAt: '2026-09-17T12:00:00Z',
    );

    expect(unverifiedUser.isUnverified, true);
    expect(unverifiedUser.isVerified, false);
    expect(unverifiedUser.isPendingReview, false);

    final pendingUser = UserProfile.fromMap({
      'email': 'artisan@wheelhomes.com',
      'fullName': 'Babatunde Electrician',
      'phone': '+234 802 345 6789',
      'role': 'service_provider',
      'status': 'pending_review',
      'applicationData': {
        'idType': 'National Identity Number (NIN)',
        'govIdUrl': 'https://res.cloudinary.com/xppp85cc/image/upload/nin.jpg',
        'passportUrl': 'https://res.cloudinary.com/xppp85cc/image/upload/passport.jpg',
        'hasDocuments': true,
      },
    }, 'user_artisan_1');

    expect(pendingUser.isPendingReview, true);
    expect(pendingUser.isVerified, false);
    expect(pendingUser.govIdUrl, 'https://res.cloudinary.com/xppp85cc/image/upload/nin.jpg');
    expect(pendingUser.passportUrl, 'https://res.cloudinary.com/xppp85cc/image/upload/passport.jpg');
    expect(pendingUser.idType, 'National Identity Number (NIN)');

    final verifiedUser = UserProfile.fromMap({
      'email': 'agent@wheelhomes.com',
      'fullName': 'Sarah Agent',
      'phone': '+234 803 111 2222',
      'role': 'agent',
      'status': 'verified',
    }, 'agent_001');

    expect(verifiedUser.isVerified, true);
    expect(verifiedUser.isPendingReview, false);
  });
}
