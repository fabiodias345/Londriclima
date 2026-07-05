import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract interface class AdminRefreshTokenStore {
  Future<String?> read();

  Future<void> write(String refreshToken);

  Future<void> clear();
}

class SecureAdminRefreshTokenStore implements AdminRefreshTokenStore {
  const SecureAdminRefreshTokenStore();

  static const _key = 'admin_refresh_token';
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(migrateWithBackup: true),
  );

  @override
  Future<String?> read() => _storage.read(key: _key);

  @override
  Future<void> write(String refreshToken) =>
      _storage.write(key: _key, value: refreshToken);

  @override
  Future<void> clear() => _storage.delete(key: _key);
}
