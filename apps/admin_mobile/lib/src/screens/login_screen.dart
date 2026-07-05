import 'package:flutter/material.dart';

import '../services/admin_api_client.dart';
import '../services/admin_biometric_auth_service.dart';
import '../services/admin_refresh_token_store.dart';
import '../theme/admin_theme.dart';
import 'dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    required this.apiClient,
    this.biometricAuth = const DeviceAdminBiometricAuthService(),
    this.refreshTokenStore = const SecureAdminRefreshTokenStore(),
  });

  final AdminApiClient apiClient;
  final AdminBiometricAuthService biometricAuth;
  final AdminRefreshTokenStore refreshTokenStore;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _loginController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  bool _biometricAvailable = false;
  bool _hasRefreshToken = false;
  String? _error;

  bool get _canUseBiometric => _biometricAvailable && _hasRefreshToken;

  @override
  void initState() {
    super.initState();
    _loadBiometricState();
  }

  @override
  void dispose() {
    _loginController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final session = await widget.apiClient.login(
        _loginController.text,
        _passwordController.text,
      );
      await widget.refreshTokenStore.write(session.refreshToken);
      if (!mounted) return;
      _openDashboard(session);
    } on AdminLoginException catch (error) {
      setState(() {
        _error = switch (error.failure) {
          AdminLoginFailure.invalidCredentials => 'Login ou senha invalidos.',
          AdminLoginFailure.firstAccessRequired =>
            'Primeiro acesso deve ser finalizado no app tecnico.',
          AdminLoginFailure.forbiddenRole =>
            'Acesso restrito a administradores.',
          AdminLoginFailure.network => 'Sem conexao com o servidor.',
          AdminLoginFailure.unexpected => 'Nao foi possivel entrar agora.',
        };
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _loadBiometricState() async {
    final available = await widget.biometricAuth.isAvailable();
    final token = await widget.refreshTokenStore.read();
    if (!mounted) return;
    setState(() {
      _biometricAvailable = available;
      _hasRefreshToken = token != null && token.isNotEmpty;
    });
  }

  Future<void> _submitBiometric() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final authenticated = await widget.biometricAuth.authenticate();
      if (!authenticated) return;

      final refreshToken = await widget.refreshTokenStore.read();
      if (refreshToken == null || refreshToken.isEmpty) {
        await _clearBiometricLogin();
        return;
      }

      final session = await widget.apiClient.refresh(refreshToken);
      if (session == null) {
        await _clearBiometricLogin();
        return;
      }

      await widget.refreshTokenStore.write(session.refreshToken);
      if (!mounted) return;
      _openDashboard(session);
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _clearBiometricLogin() async {
    await widget.refreshTokenStore.clear();
    if (!mounted) return;
    setState(() {
      _hasRefreshToken = false;
      _error = 'Sessao expirada. Entre com login e senha.';
    });
  }

  void _openDashboard(AdminSession session) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => DashboardScreen(
          session: session,
          apiClient: widget.apiClient,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(22, 28, 22, 28),
          children: [
            Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.asset(
                    'assets/clima-do-brasil-logo.jpeg',
                    width: 76,
                    height: 76,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Clima Admin',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: adminInk,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Painel mobile do administrador',
                        style: TextStyle(color: adminSlate, fontSize: 14),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 34),
            const Text(
              'Entrar',
              style: TextStyle(
                fontSize: 34,
                fontWeight: FontWeight.w900,
                color: adminInk,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Use seu login do painel web.',
              style: TextStyle(color: adminSlate, fontSize: 16),
            ),
            const SizedBox(height: 28),
            TextField(
              controller: _loginController,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Login ou e-mail',
                prefixIcon: Icon(Icons.person_outline),
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _passwordController,
              obscureText: true,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _loading ? null : _submit(),
              decoration: const InputDecoration(
                labelText: 'Senha',
                prefixIcon: Icon(Icons.lock_outline),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: adminRed.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: adminRed.withValues(alpha: 0.30)),
                ),
                child: Text(
                  _error!,
                  style: const TextStyle(
                    color: adminRed,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 22),
            FilledButton.icon(
              onPressed: _loading ? null : _submit,
              icon: _loading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.login),
              label: Text(_loading ? 'Entrando...' : 'Entrar'),
              style: FilledButton.styleFrom(
                backgroundColor: adminOrange,
                foregroundColor: adminInk,
                padding: const EdgeInsets.symmetric(vertical: 16),
                textStyle: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            if (_canUseBiometric) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _loading ? null : _submitBiometric,
                icon: const Icon(Icons.fingerprint),
                label: const Text('Entrar com digital'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: adminInk,
                  side: const BorderSide(color: adminOrange),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  textStyle: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
