import '../repositories/work_order_repository.dart';
import '../repositories/fleet_repository.dart';
import '../models/work_order.dart';

class FirstAccessRegistration {
  const FirstAccessRegistration({
    required this.onboardingToken,
    required this.password,
    required this.name,
    required this.cpf,
    required this.phone,
    required this.photo,
    required this.signaturePng,
    required this.termAccepted,
  });

  final String onboardingToken;
  final String password;
  final String name;
  final String cpf;
  final String phone;
  final ChecklistPhotoFile photo;
  final List<int> signaturePng;
  final bool termAccepted;
}

class TechnicianInviteRegistration {
  const TechnicianInviteRegistration({
    required this.code,
    required this.password,
    required this.name,
    required this.login,
    required this.email,
    required this.cpf,
    required this.phone,
    required this.photo,
    required this.signaturePng,
    required this.termAccepted,
  });

  final String code;
  final String password;
  final String name;
  final String login;
  final String email;
  final String cpf;
  final String phone;
  final ChecklistPhotoFile photo;
  final List<int> signaturePng;
  final bool termAccepted;
}

class LoginSession {
  const LoginSession({
    required this.repository,
    required this.fleetRepository,
    this.technicianName = '',
    this.refreshToken,
  });

  final WorkOrderRepository repository;
  final FleetRepository fleetRepository;
  final String technicianName;
  final String? refreshToken;
}

abstract class MobileLoginGateway {
  Future<LoginSession?> login(String user, String password);

  Future<LoginSession?> refresh(String refreshToken);

  Future<LoginSession?> completeFirstAccess(
    FirstAccessRegistration registration,
  );

  Future<bool> validateTechnicianInvite(String code);

  Future<LoginSession?> registerWithTechnicianInvite(
    TechnicianInviteRegistration registration,
  );
}
