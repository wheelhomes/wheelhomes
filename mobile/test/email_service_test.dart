import 'package:flutter_test/flutter_test.dart';
import 'package:wheelhomes_mobile/services/email_service.dart';

void main() {
  test('EmailService sends pending review email successfully', () async {
    final result = await EmailService.sendPendingReviewNotification(
      email: 'wheelofcomfort@gmail.com',
      name: 'Mobile Test User',
    );
    expect(result, isTrue);
  });
}
