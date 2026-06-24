import 'package:flutter/material.dart';

import '../repositories/fleet_repository.dart';
import '../theme/app_theme.dart';

class FuelingScreen extends StatefulWidget {
  const FuelingScreen({super.key, required this.repository});

  final FleetRepository repository;

  @override
  State<FuelingScreen> createState() => _FuelingScreenState();
}

class _FuelingScreenState extends State<FuelingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _odometerController = TextEditingController();
  final _litersController = TextEditingController();
  final _totalValueController = TextEditingController();
  late Future<List<FleetVehicle>> _vehiclesFuture;
  FleetVehicle? _selectedVehicle;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _vehiclesFuture = widget.repository.listVehicles();
  }

  @override
  void dispose() {
    _odometerController.dispose();
    _litersController.dispose();
    _totalValueController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Abastecimento')),
      body: SafeArea(
        child: FutureBuilder<List<FleetVehicle>>(
          future: _vehiclesFuture,
          builder: (context, snapshot) {
            final vehicles = snapshot.data ?? const <FleetVehicle>[];

            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }

            if (snapshot.hasError) {
              return _MessageCard(
                title: 'Nao foi possivel carregar os carros.',
                message: snapshot.error.toString(),
              );
            }

            if (vehicles.isEmpty) {
              return const _MessageCard(
                title: 'Nenhum carro disponivel.',
                message: 'Cadastre os carros no painel antes de abastecer.',
              );
            }

            _selectedVehicle ??= vehicles.first;

            return ListView(
              padding: const EdgeInsets.all(18),
              children: [
                Text(
                  'Registrar abastecimento',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: airmovebrText,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Informe apenas odometro, litros e valor total pago.',
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: airmovebrMuted),
                ),
                const SizedBox(height: 18),
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      DropdownButtonFormField<FleetVehicle>(
                        key: const Key('fuelVehicleSelect'),
                        initialValue: _selectedVehicle,
                        isExpanded: true,
                        items: vehicles
                            .map(
                              (vehicle) => DropdownMenuItem(
                                value: vehicle,
                                child: Text(
                                  vehicle.plate.isEmpty
                                      ? vehicle.name
                                      : '${vehicle.name} - ${vehicle.plate}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: _saving
                            ? null
                            : (vehicle) => setState(() {
                                _selectedVehicle = vehicle;
                              }),
                        decoration: const InputDecoration(labelText: 'Carro'),
                      ),
                      const SizedBox(height: 14),
                      _numberField(
                        key: const Key('fuelOdometerField'),
                        controller: _odometerController,
                        label: 'Odometro atual',
                        suffix: 'km',
                      ),
                      const SizedBox(height: 14),
                      _numberField(
                        key: const Key('fuelLitersField'),
                        controller: _litersController,
                        label: 'Litros abastecidos',
                        suffix: 'L',
                      ),
                      const SizedBox(height: 14),
                      _numberField(
                        key: const Key('fuelTotalValueField'),
                        controller: _totalValueController,
                        label: 'Valor total pago',
                        prefix: 'R\$ ',
                      ),
                      const SizedBox(height: 22),
                      FilledButton(
                        key: const Key('saveFuelingButton'),
                        onPressed: _saving ? null : _save,
                        child: Text(
                          _saving ? 'Salvando...' : 'Salvar abastecimento',
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  TextFormField _numberField({
    required Key key,
    required TextEditingController controller,
    required String label,
    String? suffix,
    String? prefix,
  }) {
    return TextFormField(
      key: key,
      controller: controller,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      textInputAction: TextInputAction.next,
      decoration: InputDecoration(
        labelText: label,
        suffixText: suffix,
        prefixText: prefix,
      ),
      validator: (value) {
        final number = _parseNumber(value ?? '');
        if (number == null || number <= 0) {
          return 'Informe um valor maior que zero.';
        }
        return null;
      },
    );
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate() || _selectedVehicle == null) {
      return;
    }

    setState(() {
      _saving = true;
    });

    try {
      await widget.repository.registerFueling(
        FuelingInput(
          vehicleId: _selectedVehicle!.id,
          odometerKm: _parseNumber(_odometerController.text)!,
          liters: _parseNumber(_litersController.text)!,
          totalValue: _parseNumber(_totalValueController.text)!,
        ),
      );

      if (!mounted) {
        return;
      }

      _odometerController.clear();
      _litersController.clear();
      _totalValueController.clear();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Abastecimento salvo.')));
    } on Object catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.toString())));
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
        });
      }
    }
  }

  double? _parseNumber(String value) {
    return double.tryParse(value.trim().replaceAll(',', '.'));
  }
}

class _MessageCard extends StatelessWidget {
  const _MessageCard({required this.title, required this.message});

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(18),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(message),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
