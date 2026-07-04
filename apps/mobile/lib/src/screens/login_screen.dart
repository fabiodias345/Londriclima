import 'package:flutter/material.dart';

import '../auth/onboarding_required_exception.dart';
import '../auth/mobile_login_gateway.dart';
import '../models/work_order.dart';
import '../services/barcode_scanner_service.dart';
import '../services/checklist_photo_picker.dart';
import '../services/location_service.dart';
import '../theme/app_theme.dart';
import 'first_access_screen.dart';
import 'dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    required this.loginGateway,
    this.locationService = const DeviceLocationService(),
    this.photoPicker = const DeviceChecklistPhotoPicker(),
    this.barcodeScanner = const DeviceBarcodeScannerService(),
  });

  final MobileLoginGateway loginGateway;
  final LocationService locationService;
  final ChecklistPhotoPicker photoPicker;
  final BarcodeScannerService barcodeScanner;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _userController = TextEditingController();
  final _passwordController = TextEditingController();
  String? _errorMessage;
  bool _isLoading = false;

  Future<void> _startRegistration() async {
    final controller = TextEditingController();
    final code = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Primeiro cadastro'),
        content: TextField(
          key: const Key('technicianInviteCodeField'),
          controller: controller,
          autocorrect: false,
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(labelText: 'Codigo do convite'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancelar')),
          FilledButton(
            key: const Key('validateTechnicianInviteButton'),
            onPressed: () => Navigator.pop(dialogContext, controller.text.trim()),
            child: const Text('Continuar'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (code == null || code.isEmpty || !mounted) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final valid = await widget.loginGateway.validateTechnicianInvite(code);
      if (!mounted) return;
      if (!valid) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Convite invalido, vencido ou ja utilizado.';
        });
        return;
      }
      setState(() => _isLoading = false);
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => FirstAccessScreen.invite(
            loginGateway: widget.loginGateway,
            inviteCode: code,
            locationService: widget.locationService,
            photoPicker: widget.photoPicker,
            barcodeScanner: widget.barcodeScanner,
          ),
        ),
      );
    } on Object {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMessage = 'Falha ao validar o convite.';
      });
    }
  }

  @override
  void dispose() {
    _userController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final user = _userController.text.trim().toLowerCase();
    final password = _passwordController.text;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final LoginSession? session;
    try {
      session = await widget.loginGateway.login(user, password);
    } on OnboardingRequiredException catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isLoading = false;
        _errorMessage = null;
      });

      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => FirstAccessScreen(
            loginGateway: widget.loginGateway,
            onboardingToken: error.onboardingToken,
            technicianName: error.technicianName,
            locationService: widget.locationService,
            photoPicker: widget.photoPicker,
            barcodeScanner: widget.barcodeScanner,
          ),
        ),
      );
      return;
    } on Object {
      if (!mounted) {
        return;
      }

      setState(() {
        _isLoading = false;
        _errorMessage = 'Falha ao conectar na API.';
      });
      return;
    }

    if (!mounted) {
      return;
    }

    if (session != null) {
      final loginSession = session;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => DashboardScreen(
            repository: loginSession.repository,
            fleetRepository: loginSession.fleetRepository,
            locationService: widget.locationService,
            photoPicker: widget.photoPicker,
            barcodeScanner: widget.barcodeScanner,
            technicianName: loginSession.technicianName,
          ),
        ),
      );
      return;
    }

    setState(() {
      _isLoading = false;
      _errorMessage = 'Login ou senha invalido.';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        color: neuroBase,
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Image.asset('assets/airmovebr-logo.png', height: 128),
                    const SizedBox(height: 32),
                    Text(
                      'Acesso AIRMOVEBR',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: neuroText,
                            fontSize: 26,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Entre para acessar a operacao.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: neuroMuted,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 32),
                    TextField(
                      key: const Key('loginUserField'),
                      controller: _userController,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Login',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      key: const Key('loginPasswordField'),
                      controller: _passwordController,
                      obscureText: true,
                      onSubmitted: (_) => _login(),
                      decoration: const InputDecoration(
                        labelText: 'Senha',
                        prefixIcon: Icon(Icons.lock_outline),
                      ),
                    ),
                    if (_errorMessage != null) ...[
                      const SizedBox(height: 16),
                      Text(
                        _errorMessage!,
                        key: const Key('loginErrorMessage'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: neuroDanger,
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
                    ],
                    const SizedBox(height: 28),
                    FilledButton(
                      key: const Key('loginSubmitButton'),
                      onPressed: _isLoading ? null : _login,
                      child: Text(
                        _isLoading ? 'Entrando...' : 'Entrar',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      key: const Key('firstRegistrationButton'),
                      onPressed: _isLoading ? null : _startRegistration,
                      child: const Text('Primeiro cadastro'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
