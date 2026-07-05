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

  @override
  Future<LoginSession?> refresh(String refreshToken) async {
    if (demoMode) {
      return _fakeLoginGateway.refresh(refreshToken);
    }

    final baseUrl = apiBaseUrl;
    if (baseUrl == null) {
      throw StateError('MOBILE_API_BASE_URL nao configurada.');
    }

    return ApiLoginGateway(baseUrl: baseUrl).refresh(refreshToken);
  }

  @override
  Future<LoginSession?> completeFirstAccess(
    FirstAccessRegistration registration,
  ) async {
    if (demoMode) {
      return _fakeLoginGateway.completeFirstAccess(registration);
    }

    final baseUrl = apiBaseUrl;
    if (baseUrl == null) {
      throw StateError('MOBILE_API_BASE_URL nao configurada.');
    }

    return ApiLoginGateway(baseUrl: baseUrl).completeFirstAccess(registration);
  }

  @override
  Future<bool> validateTechnicianInvite(String code) async {
    if (demoMode) {
      return _fakeLoginGateway.validateTechnicianInvite(code);
    }
    final baseUrl = apiBaseUrl;
    if (baseUrl == null) {
      throw StateError('MOBILE_API_BASE_URL nao configurada.');
    }
    return ApiLoginGateway(baseUrl: baseUrl).validateTechnicianInvite(code);
  }

  @override
  Future<LoginSession?> registerWithTechnicianInvite(
    TechnicianInviteRegistration registration,
  ) async {
    if (demoMode) {
      return _fakeLoginGateway.registerWithTechnicianInvite(registration);
    }
    final baseUrl = apiBaseUrl;
    if (baseUrl == null) {
      throw StateError('MOBILE_API_BASE_URL nao configurada.');
    }
    return ApiLoginGateway(
      baseUrl: baseUrl,
    ).registerWithTechnicianInvite(registration);
  }
}
