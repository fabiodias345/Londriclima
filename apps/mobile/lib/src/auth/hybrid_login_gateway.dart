import 'api_login_gateway.dart';
import 'fake_login_gateway.dart';
import 'mobile_login_gateway.dart';

class HybridLoginGateway implements MobileLoginGateway {
  HybridLoginGateway({required this.apiBaseUrl})
    : _fakeLoginGateway = FakeLoginGateway();

  final Uri? apiBaseUrl;
  final FakeLoginGateway _fakeLoginGateway;

  @override
  Future<LoginSession?> login(String user, String password) async {
    if (apiBaseUrl != null) {
      try {
        final apiSession = await ApiLoginGateway(
          baseUrl: apiBaseUrl!,
        ).login(user, password);
        if (apiSession != null) {
          return apiSession;
        }
      } on Object {
        // Fallback local mantem o APK testavel sem backend na rede.
      }
    }

    return _fakeLoginGateway.login(user, password);
  }
}
