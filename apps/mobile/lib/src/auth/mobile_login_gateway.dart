import '../repositories/work_order_repository.dart';
import '../repositories/fleet_repository.dart';

class LoginSession {
  const LoginSession({
    required this.repository,
    required this.fleetRepository,
    this.technicianName = '',
  });

  final WorkOrderRepository repository;
  final FleetRepository fleetRepository;
  final String technicianName;
}

abstract class MobileLoginGateway {
  Future<LoginSession?> login(String user, String password);
}
