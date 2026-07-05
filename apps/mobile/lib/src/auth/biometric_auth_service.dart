import 'package:local_auth/local_auth.dart';

abstract interface class BiometricAuthService {
  Future<bool> isAvailable();

  Future<bool> authenticate();
}

class DeviceBiometricAuthService implements BiometricAuthService {
  const DeviceBiometricAuthService();

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
        localizedReason: 'Use sua digital para entrar',
        biometricOnly: true,
        persistAcrossBackgrounding: true,
      );
    } on Object {
      return false;
    }
  }
}
