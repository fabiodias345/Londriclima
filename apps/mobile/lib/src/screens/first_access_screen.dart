import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../auth/mobile_login_gateway.dart';
import '../models/work_order.dart';
import '../services/barcode_scanner_service.dart';
import '../services/checklist_photo_picker.dart';
import '../services/location_service.dart';
import '../theme/app_theme.dart';
import '../widgets/signature_pad.dart';
import 'dashboard_screen.dart';

class FirstAccessScreen extends StatefulWidget {
  const FirstAccessScreen({
    super.key,
    required this.loginGateway,
    required this.onboardingToken,
    required this.technicianName,
    this.locationService = const DeviceLocationService(),
    this.photoPicker = const DeviceChecklistPhotoPicker(),
    this.barcodeScanner = const DeviceBarcodeScannerService(),
  }) : inviteCode = null;

  const FirstAccessScreen.invite({
    super.key,
    required this.loginGateway,
    required this.inviteCode,
    this.locationService = const DeviceLocationService(),
    this.photoPicker = const DeviceChecklistPhotoPicker(),
    this.barcodeScanner = const DeviceBarcodeScannerService(),
  }) : onboardingToken = null,
       technicianName = '';

  final MobileLoginGateway loginGateway;
  final String? onboardingToken;
  final String technicianName;
  final String? inviteCode;
  final LocationService locationService;
  final ChecklistPhotoPicker photoPicker;
  final BarcodeScannerService barcodeScanner;

  @override
  State<FirstAccessScreen> createState() => _FirstAccessScreenState();
}

class _FirstAccessScreenState extends State<FirstAccessScreen> {
  late final TextEditingController _nameController;
  final _cpfController = TextEditingController();
  final _phoneController = TextEditingController();
  final _loginController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  final List<Offset?> _signaturePoints = [];
  ChecklistPhotoFile? _photo;
  bool _termAccepted = false;
  String? _errorMessage;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.technicianName);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _cpfController.dispose();
    _phoneController.dispose();
    _loginController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    final name = _nameController.text.trim();
    final cpf = _digits(_cpfController.text);
    final phone = _digits(_phoneController.text);
    final password = _passwordController.text;
    final confirm = _confirmController.text;
    final login = _loginController.text.trim().toLowerCase();
    final email = _emailController.text.trim().toLowerCase();

    if (name.length < 3) {
      setState(() => _errorMessage = 'Informe o nome completo.');
      return;
    }

    if (cpf.length != 11) {
      setState(() => _errorMessage = 'Informe um CPF com 11 dígitos.');
      return;
    }

    if (phone.length < 10 || phone.length > 11) {
      setState(() => _errorMessage = 'Informe um telefone com DDD.');
      return;
    }

    if (widget.inviteCode != null &&
        (!RegExp(r'^[a-zA-Z0-9._-]+$').hasMatch(login) ||
            !email.contains('@'))) {
      setState(() => _errorMessage = 'Preencha login e e-mail corretamente.');
      return;
    }

    if (_photo == null) {
      setState(() => _errorMessage = 'Tire uma foto para concluir o cadastro.');
      return;
    }

    if (_signaturePoints.whereType<Offset>().isEmpty) {
      setState(() => _errorMessage = 'Assine no campo indicado.');
      return;
    }

    if (!_termAccepted) {
      setState(
        () => _errorMessage = 'Leia e aceite o termo de responsabilidade.',
      );
      return;
    }

    if (password.length < 6) {
      setState(() {
        _errorMessage = 'A senha precisa ter no mínimo 6 caracteres.';
      });
      return;
    }

    if (password != confirm) {
      setState(() {
        _errorMessage = 'As senhas não conferem.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final LoginSession? session;
    try {
      final signature = await _signaturePng();
      session = widget.inviteCode == null
          ? await widget.loginGateway.completeFirstAccess(
              FirstAccessRegistration(
                onboardingToken: widget.onboardingToken!,
                password: password,
                name: name,
                cpf: cpf,
                phone: phone,
                photo: _photo!,
                signaturePng: signature,
                termAccepted: _termAccepted,
              ),
            )
          : await widget.loginGateway.registerWithTechnicianInvite(
              TechnicianInviteRegistration(
                code: widget.inviteCode!,
                password: password,
                name: name,
                login: login,
                email: email,
                cpf: cpf,
                phone: phone,
                photo: _photo!,
                signaturePng: signature,
                termAccepted: _termAccepted,
              ),
            );
    } on Object {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMessage = 'Falha ao conectar na API.';
      });
      return;
    }

    if (!mounted) {
      return;
    }

    if (session == null) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Não foi possível concluir o primeiro acesso.';
      });
      return;
    }
    final activeSession = session;

    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => DashboardScreen(
          repository: activeSession.repository,
          fleetRepository: activeSession.fleetRepository,
          locationService: widget.locationService,
          photoPicker: widget.photoPicker,
          barcodeScanner: widget.barcodeScanner,
          technicianName: activeSession.technicianName.isEmpty
              ? widget.technicianName
              : activeSession.technicianName,
        ),
      ),
    );
  }

  Future<void> _takePhoto() async {
    final photo = await widget.photoPicker.pickPhoto();
    if (photo != null && mounted) setState(() => _photo = photo);
  }

  Future<List<int>> _signaturePng() async {
    const size = Size(640, 220);
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder)..drawColor(Colors.white, BlendMode.src);
    SignaturePainter(_signaturePoints).paint(canvas, size);
    final image = await recorder.endRecording().toImage(
      size.width.toInt(),
      size.height.toInt(),
    );
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    return data!.buffer.asUint8List();
  }

  String _digits(String value) => value.replaceAll(RegExp(r'\D'), '');

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
                    Image.asset(
                      'assets/airmovebr-logo.png',
                      height: 128,
                    ),
                    const SizedBox(height: 32),
                    Text(
                      widget.inviteCode == null
                          ? 'Primeiro acesso'
                          : 'Cadastro de técnico',
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
                      widget.technicianName.isEmpty
                          ? 'Complete seus dados para liberar o acesso.'
                          : 'Bem-vindo, ${widget.technicianName}. Complete seus dados para liberar o acesso.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: neuroMuted,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 32),
                    TextField(
                      key: const Key('firstAccessNameField'),
                      controller: _nameController,
                      textCapitalization: TextCapitalization.words,
                      decoration: const InputDecoration(
                        labelText: 'Nome completo',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                    ),
                    if (widget.inviteCode != null) ...[
                      const SizedBox(height: 16),
                      TextField(
                        key: const Key('firstAccessLoginField'),
                        controller: _loginController,
                        autocorrect: false,
                        decoration: const InputDecoration(
                          labelText: 'Login',
                          prefixIcon: Icon(Icons.account_circle_outlined),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        key: const Key('firstAccessEmailField'),
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        autocorrect: false,
                        decoration: const InputDecoration(
                          labelText: 'E-mail',
                          prefixIcon: Icon(Icons.email_outlined),
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    TextField(
                      key: const Key('firstAccessCpfField'),
                      controller: _cpfController,
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        const _DigitsMaskFormatter(
                          maxDigits: 11,
                          mask: _cpfMask,
                        ),
                      ],
                      decoration: const InputDecoration(
                        labelText: 'CPF',
                        hintText: '000.000.000-00',
                        prefixIcon: Icon(Icons.badge_outlined),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      key: const Key('firstAccessPhoneField'),
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        const _DigitsMaskFormatter(
                          maxDigits: 11,
                          mask: _phoneMask,
                        ),
                      ],
                      decoration: const InputDecoration(
                        labelText: 'Telefone',
                        hintText: '(00) 00000-0000',
                        prefixIcon: Icon(Icons.phone_outlined),
                      ),
                    ),
                    const SizedBox(height: 20),
                    OutlinedButton.icon(
                      key: const Key('firstAccessPhotoButton'),
                      onPressed: _isLoading ? null : _takePhoto,
                      icon: Icon(
                        _photo == null
                            ? Icons.photo_camera_outlined
                            : Icons.check_circle_outline,
                      ),
                      label: Text(
                        _photo == null
                            ? 'Tirar foto do funcionário'
                            : 'Foto registrada - tirar novamente',
                      ),
                    ),
                    if (_photo != null) ...[
                      const SizedBox(height: 12),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.memory(
                          Uint8List.fromList(_photo!.bytes),
                          key: const Key('firstAccessPhotoPreview'),
                          height: 180,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    Text(
                      'Assinatura',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 8),
                    SignaturePadField(
                      signatureKey: const Key('firstAccessSignaturePad'),
                      points: _signaturePoints,
                      enabled: !_isLoading,
                      onChanged: (points) => setState(() {
                        _signaturePoints
                          ..clear()
                          ..addAll(points);
                      }),
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        key: const Key('firstAccessClearSignatureButton'),
                        onPressed: _signaturePoints.isEmpty || _isLoading
                            ? null
                            : () => setState(_signaturePoints.clear),
                        child: const Text('Limpar assinatura'),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Termo de responsabilidade',
                              style: TextStyle(fontWeight: FontWeight.w900),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Declaro que o acesso ao aplicativo é pessoal. Comprometo-me a executar os checklists, registrar os atendimentos corretamente, utilizar os EPIs descritos no sistema, não compartilhar minha senha e proteger os dados dos clientes. Autorizo o uso do meu nome, foto e assinatura nos relatórios dos serviços executados por mim.',
                            ),
                            CheckboxListTile(
                              key: const Key('firstAccessTermCheckbox'),
                              value: _termAccepted,
                              contentPadding: EdgeInsets.zero,
                              controlAffinity: ListTileControlAffinity.leading,
                              title: const Text('Li e aceito este termo.'),
                              onChanged: _isLoading
                                  ? null
                                  : (value) => setState(
                                      () => _termAccepted = value ?? false,
                                    ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      key: const Key('firstAccessPasswordField'),
                      controller: _passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'Nova senha',
                        prefixIcon: Icon(Icons.lock_outline),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      key: const Key('firstAccessConfirmField'),
                      controller: _confirmController,
                      obscureText: true,
                      onSubmitted: (_) => _confirm(),
                      decoration: const InputDecoration(
                        labelText: 'Confirmar senha',
                        prefixIcon: Icon(Icons.lock_outline),
                      ),
                    ),
                    if (_errorMessage != null) ...[
                      const SizedBox(height: 16),
                      Text(
                        _errorMessage!,
                        key: const Key('firstAccessErrorMessage'),
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
                      key: const Key('firstAccessSubmitButton'),
                      onPressed: _isLoading ? null : _confirm,
                      child: Text(
                        _isLoading ? 'Salvando...' : 'Ativar acesso',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
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

String _cpfMask(String digits) => _applyDigitsMask(digits, '###.###.###-##');

String _phoneMask(String digits) => _applyDigitsMask(
  digits,
  digits.length <= 10 ? '(##) ####-####' : '(##) #####-####',
);

String _applyDigitsMask(String digits, String pattern) {
  final output = StringBuffer();
  var digitIndex = 0;
  for (var patternIndex = 0; patternIndex < pattern.length; patternIndex += 1) {
    final character = pattern[patternIndex];
    if (character == '#') {
      if (digitIndex >= digits.length) break;
      output.write(digits[digitIndex]);
      digitIndex += 1;
    } else if (digitIndex < digits.length) {
      output.write(character);
    }
  }
  return output.toString();
}

class _DigitsMaskFormatter extends TextInputFormatter {
  const _DigitsMaskFormatter({required this.maxDigits, required this.mask});

  final int maxDigits;
  final String Function(String) mask;

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final rawDigits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final digits = rawDigits.length > maxDigits
        ? rawDigits.substring(0, maxDigits)
        : rawDigits;
    final formatted = mask(digits);
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
