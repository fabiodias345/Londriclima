import '../repositories/work_order_repository.dart';

class LoginSession {
  const LoginSession({required this.repository});

  final WorkOrderRepository repository;
}

abstract class MobileLoginGateway {
  Future<LoginSession?> login(String user, String password);
}
