import '../data/fake_work_order_repository.dart';
import 'mobile_login_gateway.dart';

class FakeLoginGateway implements MobileLoginGateway {
  @override
  Future<LoginSession?> login(String user, String password) async {
    final normalizedUser = user.trim().toLowerCase();
    if (normalizedUser == 'teste' && password == '123456') {
      return LoginSession(repository: FakeWorkOrderRepository());
    }

    return null;
  }
}
