import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

abstract class BarcodeScannerService {
  Future<String?> scanBarcode(BuildContext context);
}

class DeviceBarcodeScannerService implements BarcodeScannerService {
  const DeviceBarcodeScannerService();

  @override
  Future<String?> scanBarcode(BuildContext context) {
    return Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const _BarcodeScannerScreen()),
    );
  }
}

class _BarcodeScannerScreen extends StatefulWidget {
  const _BarcodeScannerScreen();

  @override
  State<_BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends State<_BarcodeScannerScreen> {
  bool _done = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ler codigo')),
      body: Stack(
        children: [
          MobileScanner(
            onDetect: (capture) {
              if (_done) {
                return;
              }
              final value = capture.barcodes
                  .map((barcode) => barcode.rawValue)
                  .whereType<String>()
                  .where((code) => code.trim().isNotEmpty)
                  .firstOrNull;
              if (value == null) {
                return;
              }
              _done = true;
              Navigator.of(context).pop(value.trim());
            },
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              color: Colors.black.withValues(alpha: 0.62),
              child: const Text(
                'Aponte a camera para o QR ou codigo de barras da maquina.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
