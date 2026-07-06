import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class SignaturePadField extends StatelessWidget {
  const SignaturePadField({
    super.key,
    required this.signatureKey,
    required this.points,
    required this.enabled,
    required this.onChanged,
  });

  final Key signatureKey;
  final List<Offset?> points;
  final bool enabled;
  final ValueChanged<List<Offset?>> onChanged;

  @override
  Widget build(BuildContext context) {
    final hasSignature = points.whereType<Offset>().isNotEmpty;
    return OutlinedButton.icon(
      key: signatureKey,
      onPressed: enabled ? () => _openSignatureDialog(context) : null,
      icon: Icon(hasSignature ? Icons.edit_outlined : Icons.draw_outlined),
      label: Text(hasSignature ? 'Refazer assinatura' : 'Coletar assinatura'),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        foregroundColor: airmovebrPrimary,
        side: const BorderSide(color: airmovebrBorder),
      ),
    );
  }

  Future<void> _openSignatureDialog(BuildContext context) async {
    final result = await showDialog<List<Offset?>>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _SignatureDialog(initialPoints: points),
    );
    if (result != null) {
      onChanged(result);
    }
  }
}

class _SignatureDialog extends StatefulWidget {
  const _SignatureDialog({required this.initialPoints});

  final List<Offset?> initialPoints;

  @override
  State<_SignatureDialog> createState() => _SignatureDialogState();
}

class _SignatureDialogState extends State<_SignatureDialog> {
  late List<Offset?> _points;

  bool get _hasSignature => _points.whereType<Offset>().isNotEmpty;

  @override
  void initState() {
    super.initState();
    _points = List<Offset?>.of(widget.initialPoints);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Assinatura do responsavel'),
      contentPadding: const EdgeInsets.fromLTRB(24, 12, 24, 8),
      content: SizedBox(
        width: 520,
        child: _SignatureCanvas(
          key: const Key('signaturePadCanvas'),
          points: _points,
          onChanged: (points) {
            setState(() {
              _points = points;
            });
          },
        ),
      ),
      actions: [
        TextButton.icon(
          key: const Key('clearSignatureDialogButton'),
          onPressed: _hasSignature
              ? () {
                  setState(() {
                    _points = [];
                  });
                }
              : null,
          icon: const Icon(Icons.backspace_outlined),
          label: const Text('Limpar'),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        FilledButton.icon(
          key: const Key('confirmSignatureButton'),
          onPressed: _hasSignature
              ? () => Navigator.of(context).pop(List<Offset?>.of(_points))
              : null,
          icon: const Icon(Icons.check_outlined),
          label: const Text('Confirmar'),
          style: FilledButton.styleFrom(
            backgroundColor: airmovebrAccent,
            foregroundColor: Colors.white,
          ),
        ),
      ],
    );
  }
}

class _SignatureCanvas extends StatefulWidget {
  const _SignatureCanvas({
    super.key,
    required this.points,
    required this.onChanged,
  });

  final List<Offset?> points;
  final ValueChanged<List<Offset?>> onChanged;

  @override
  State<_SignatureCanvas> createState() => _SignatureCanvasState();
}

class _SignatureCanvasState extends State<_SignatureCanvas> {
  late List<Offset?> _points;

  @override
  void initState() {
    super.initState();
    _points = List<Offset?>.of(widget.points);
  }

  @override
  void didUpdateWidget(covariant _SignatureCanvas oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.points.isEmpty && _points.isNotEmpty) {
      _points = [];
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onPanStart: (details) => _addPoint(details.localPosition),
      onPanUpdate: (details) => _addPoint(details.localPosition),
      onPanEnd: (_) {
        _points.add(null);
        widget.onChanged(List<Offset?>.of(_points));
      },
      onTapDown: (details) => _addPoint(details.localPosition),
      child: CustomPaint(
        foregroundPainter: SignaturePainter(_points),
        child: Container(
          height: 260,
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: const Color(0xFFD8DEE8)),
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
    );
  }

  void _addPoint(Offset point) {
    setState(() {
      _points.add(point);
    });
    widget.onChanged(List<Offset?>.of(_points));
  }
}

class SignaturePainter extends CustomPainter {
  const SignaturePainter(this.points);

  final List<Offset?> points;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = airmovebrText
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    for (var index = 0; index < points.length - 1; index += 1) {
      final current = points[index];
      final next = points[index + 1];
      if (current != null && next != null) {
        canvas.drawLine(current, next, paint);
      } else if (current != null) {
        canvas.drawCircle(current, 2, paint);
      }
    }
    if (points.length == 1 && points.first != null) {
      canvas.drawCircle(points.first!, 2, paint);
    }
  }

  @override
  bool shouldRepaint(covariant SignaturePainter oldDelegate) {
    return oldDelegate.points != points;
  }
}
