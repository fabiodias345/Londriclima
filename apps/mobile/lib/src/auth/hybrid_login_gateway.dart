import 'api_login_gateway.dart';
import 'fake_login_gateway.dart';
import 'mobile_login_gateway.dart';

class HybridLoginGateway implements MobileLoginGateway {
  HybridLoginGateway({required this.apiBaseUrl, this.demoMode = false})
    : _fakeLoginGateway = FakeLoginGateway();

  final Uri? apiBaseUrl;
  final bool demoMode;
  final FakeLoginGateway _fakeLoginGateway;

  @override
  Future<LoginSession?> login(String user, String password) async {
    if (demoMode) {
      return _fakeLoginGateway.login(user, password);
    }

    final baseUrl = apiBaseUrl;
    if (baseUrl == null) {
      throw StateError('MOBILE_API_BASE_URL nao configurada.');
    }

    return ApiLoginGateway(baseUrl: baseUrl).login(user, password);
  }
}
