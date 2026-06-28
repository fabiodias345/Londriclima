import 'package:flutter_test/flutter_test.dart';
import 'package:airmovebr_mobile/src/auth/hybrid_login_gateway.dart';

void main() {
  test('modo operacional exige URL da API e nao usa login fake', () async {
    final gateway = HybridLoginGateway(apiBaseUrl: null);

    await expectLater(
      gateway.login('tecnico', '123456'),
      throwsA(isA<StateError>()),
    );
  });

  test('modo demo explicito permite login fake', () async {
    final gateway = HybridLoginGateway(apiBaseUrl: null, demoMode: true);

    final session = await gateway.login('tecnico', '123456');

    expect(session, isNotNull);
  });
}
