class FleetVehicle {
  const FleetVehicle({
    required this.id,
    required this.name,
    required this.plate,
  });

  final String id;
  final String name;
  final String plate;
}

class FuelingInput {
  const FuelingInput({
    required this.vehicleId,
    required this.odometerKm,
    required this.liters,
    required this.totalValue,
  });

  final String vehicleId;
  final double odometerKm;
  final double liters;
  final double totalValue;
}

abstract class FleetRepository {
  Future<List<FleetVehicle>> listVehicles();

  Future<void> registerFueling(FuelingInput input);
}

class FakeFleetRepository implements FleetRepository {
  final List<FuelingInput> fuelings = [];

  @override
  Future<List<FleetVehicle>> listVehicles() async {
    return const [
      FleetVehicle(
        id: 'veiculo-1',
        name: 'Carro 01 - Manutencao',
        plate: 'LDC1A23',
      ),
      FleetVehicle(
        id: 'veiculo-2',
        name: 'Carro 02 - Instalacao',
        plate: 'LDC2B34',
      ),
    ];
  }

  @override
  Future<void> registerFueling(FuelingInput input) async {
    fuelings.add(input);
  }
}
