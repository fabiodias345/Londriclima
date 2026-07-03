import 'dart:ui' as ui;
import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../auth/mobile_login_gateway.dart';
import '../models/work_order.dart';
import '../services/barcode_scanner_service.dart';
import '../services/checklist_photo_picker.dart';
import '../services/location_service.dart';
import '../theme/app_theme.dart';
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
  });

  final MobileLoginGateway loginGateway;
  final String onboardingToken;
  final String technicianName;
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

    if (name.length < 3 || cpf.length != 11 || phone.length < 10) {
      setState(() => _errorMessage = 'Preencha nome, CPF e telefone corretamente.');
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
      setState(() => _errorMessage = 'Leia e aceite o termo de responsabilidade.');
      return;
    }

    if (password.length < 6) {
      setState(() {
        _errorMessage = 'A senha precisa ter no minimo 6 caracteres.';
      });
      return;
    }

    if (password != confirm) {
      setState(() {
        _errorMessage = 'As senhas nao conferem.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final LoginSession? session;
    try {
      session = await widget.loginGateway.completeFirstAccess(
        FirstAccessRegistration(
          onboardingToken: widget.onboardingToken,
          password: password,
          name: name,
          cpf: cpf,
          phone: phone,
          photo: _photo!,
          signaturePng: await _signaturePng(),
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
        _errorMessage = 'Nao foi possivel concluir o primeiro acesso.';
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
    _FirstAccessSignaturePainter(_signaturePoints).paint(canvas, size);
    final image = await recorder.endRecording().toImage(size.width.toInt(), size.height.toInt());
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
                    Image.asset('assets/airmovebr-logo.png', height: 128),
                    const SizedBox(height: 32),
                    Text(
                      'Primeiro acesso',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
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
                    const SizedBox(height: 16),
                    TextField(
                      key: const Key('firstAccessCpfField'),
                      controller: _cpfController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'CPF',
                        prefixIcon: Icon(Icons.badge_outlined),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      key: const Key('firstAccessPhoneField'),
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Telefone',
                        prefixIcon: Icon(Icons.phone_outlined),
                      ),
                    ),
                    const SizedBox(height: 20),
                    OutlinedButton.icon(
                      key: const Key('firstAccessPhotoButton'),
                      onPressed: _isLoading ? null : _takePhoto,
                      icon: Icon(_photo == null ? Icons.photo_camera_outlined : Icons.check_circle_outline),
                      label: Text(_photo == null ? 'Tirar foto do funcionario' : 'Foto registrada - tirar novamente'),
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
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    _FirstAccessSignaturePad(
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
                              'Declaro que o acesso ao aplicativo e pessoal. Comprometo-me a executar os checklists, registrar os atendimentos corretamente, utilizar os EPIs descritos no sistema, nao compartilhar minha senha e proteger os dados dos clientes. Autorizo o uso do meu nome, foto e assinatura nos relatorios dos servicos executados por mim.',
                            ),
                            CheckboxListTile(
                              key: const Key('firstAccessTermCheckbox'),
                              value: _termAccepted,
                              contentPadding: EdgeInsets.zero,
                              controlAffinity: ListTileControlAffinity.leading,
                              title: const Text('Li e aceito este termo.'),
                              onChanged: _isLoading
                                  ? null
                                  : (value) => setState(() => _termAccepted = value ?? false),
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

class _FirstAccessSignaturePad extends StatefulWidget {
  const _FirstAccessSignaturePad({
    required this.points,
    required this.enabled,
    required this.onChanged,
  });

  final List<Offset?> points;
  final bool enabled;
  final ValueChanged<List<Offset?>> onChanged;

  @override
  State<_FirstAccessSignaturePad> createState() => _FirstAccessSignaturePadState();
}

class _FirstAccessSignaturePadState extends State<_FirstAccessSignaturePad> {
  late List<Offset?> _points;

  @override
  void initState() {
    super.initState();
    _points = List<Offset?>.of(widget.points);
  }

  @override
  void didUpdateWidget(covariant _FirstAccessSignaturePad oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.points.isEmpty && _points.isNotEmpty) _points = [];
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      key: const Key('firstAccessSignaturePad'),
      behavior: HitTestBehavior.opaque,
      onPanStart: widget.enabled ? (details) => _add(details.localPosition) : null,
      onPanUpdate: widget.enabled ? (details) => _add(details.localPosition) : null,
      onPanEnd: widget.enabled
          ? (_) {
              _points.add(null);
              widget.onChanged(List<Offset?>.of(_points));
            }
          : null,
      child: CustomPaint(
        foregroundPainter: _FirstAccessSignaturePainter(_points),
        child: Container(
          height: 180,
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: const Color(0xFFD8DEE8)),
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
    );
  }

  void _add(Offset point) {
    setState(() => _points.add(point));
    widget.onChanged(List<Offset?>.of(_points));
  }
}

class _FirstAccessSignaturePainter extends CustomPainter {
  const _FirstAccessSignaturePainter(this.points);

  final List<Offset?> points;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = neuroText
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;
    for (var index = 0; index < points.length - 1; index += 1) {
      final current = points[index];
      final next = points[index + 1];
      if (current != null && next != null) canvas.drawLine(current, next, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _FirstAccessSignaturePainter oldDelegate) => oldDelegate.points != points;
}
