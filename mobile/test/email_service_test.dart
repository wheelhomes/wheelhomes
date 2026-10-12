import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:wheelhomes_mobile/services/email_service.dart';

void main() {
  test('EmailService dispatches pending review request to backend API', () async {
    final mockClient = MockClient((request) async {
      expect(request.url.path, '/api/notify-pending-review');
      final body = jsonDecode(request.body) as Map<String, dynamic>;
      expect(body['email'], 'wheelofcomfort@gmail.com');
      expect(body['name'], 'Mobile Test User');
      return http.Response(jsonEncode({'success': true}), 200);
    });

    final result = await EmailService.sendPendingReviewNotification(
      email: 'wheelofcomfort@gmail.com',
      name: 'Mobile Test User',
      client: mockClient,
    );

    expect(result, isTrue);
  });

  test('EmailService returns false on empty email without network call', () async {
    final result = await EmailService.sendPendingReviewNotification(
      email: '',
      name: 'Mobile Test User',
    );

    expect(result, isFalse);
  });
}
