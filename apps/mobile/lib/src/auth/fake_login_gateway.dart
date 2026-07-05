import '../data/fake_work_order_repository.dart';
import '../repositories/fleet_repository.dart';
import 'mobile_login_gateway.dart';

class FakeLoginGateway implements MobileLoginGateway {
  @override
  Future<LoginSession?> login(String user, String password) async {
    final normalizedUser = user.trim().toLowerCase();
    final isDemoUser =
        normalizedUser == 'teste' ||
        normalizedUser == 'tecnico' ||
        normalizedUser == 'tecnico@airmovebr.local';
    if (isDemoUser && password == '123456') {
      return LoginSession(
        repository: FakeWorkOrderRepository(),
        fleetRepository: FakeFleetRepository(),
        technicianName: 'Tecnico Clima do Brasil',
      );
    }

    return null;
  }

  @override
  Future<LoginSession?> refresh(String refreshToken) async => null;

  @override
  Future<LoginSession?> completeFirstAccess(
    FirstAccessRegistration registration,
  ) async {
    return LoginSession(
      repository: FakeWorkOrderRepository(),
      fleetRepository: FakeFleetRepository(),
      technicianName: registration.name,
    );
  }

  @override
  Future<bool> validateTechnicianInvite(String code) async =>
      code.trim().isNotEmpty;

  @override
  Future<LoginSession?> registerWithTechnicianInvite(
    TechnicianInviteRegistration registration,
  ) async {
    return LoginSession(
      repository: FakeWorkOrderRepository(),
      fleetRepository: FakeFleetRepository(),
      technicianName: registration.name,
    );
  }
}
