import 'package:local_auth/local_auth.dart';

abstract interface class AdminBiometricAuthService {
  Future<bool> isAvailable();

  Future<bool> authenticate();
}

class DeviceAdminBiometricAuthService implements AdminBiometricAuthService {
  const DeviceAdminBiometricAuthService();

  @override
  Future<bool> isAvailable() async {
    try {
      final auth = LocalAuthentication();
      return await auth.canCheckBiometrics &&
          (await auth.getAvailableBiometrics()).isNotEmpty;
    } on Object {
      return false;
    }
  }

  @override
  Future<bool> authenticate() async {
    try {
      return await LocalAuthentication().authenticate(
        localizedReason: 'Use sua digital para entrar no admin',
        biometricOnly: true,
        persistAcrossBackgrounding: true,
      );
    } on Object {
      return false;
    }
  }
}
