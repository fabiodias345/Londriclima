import '../repositories/work_order_repository.dart';
import '../repositories/fleet_repository.dart';

class LoginSession {
  const LoginSession({required this.repository, required this.fleetRepository});

  final WorkOrderRepository repository;
  final FleetRepository fleetRepository;
}

abstract class MobileLoginGateway {
  Future<LoginSession?> login(String user, String password);
}
