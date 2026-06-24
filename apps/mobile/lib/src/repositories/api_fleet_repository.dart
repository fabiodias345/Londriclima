import 'dart:convert';
import 'dart:io';

import 'fleet_repository.dart';

class ApiFleetRepository implements FleetRepository {
  const ApiFleetRepository({required this.baseUrl, required this.token});

  final Uri baseUrl;
  final String token;

  @override
  Future<List<FleetVehicle>> listVehicles() async {
    final uri = baseUrl.resolve('/api/v1/mobile/frota/veiculos');
    final client = HttpClient();

    try {
      final request = await client.getUrl(uri);
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      final response = await request.close();
      final body = await response.transform(utf8.decoder).join();

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw HttpException('Falha ao carregar carros: ${response.statusCode}');
      }

      final decoded = jsonDecode(body);
      final items = decoded is List ? decoded : decoded['items'] as List;
      return items.map((item) {
        final map = item as Map<String, dynamic>;
        return FleetVehicle(
          id: map['id'].toString(),
          name: map['nome']?.toString() ?? map['name'].toString(),
          plate: map['placa']?.toString() ?? map['plate']?.toString() ?? '',
        );
      }).toList();
    } finally {
      client.close(force: true);
    }
  }

  @override
  Future<void> registerFueling(FuelingInput input) async {
    final uri = baseUrl.resolve('/api/v1/mobile/frota/abastecimentos');
    final client = HttpClient();

    try {
      final request = await client.postUrl(uri);
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      request.headers.contentType = ContentType.json;
      request.write(
        jsonEncode({
          'veiculo_id': input.vehicleId,
          'odometro_km': input.odometerKm,
          'litros': input.liters,
          'valor_total': input.totalValue,
        }),
      );

      final response = await request.close();
      final body = await response.transform(utf8.decoder).join();

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw HttpException(_errorMessage(body, response.statusCode));
      }
    } finally {
      client.close(force: true);
    }
  }

  String _errorMessage(String body, int statusCode) {
    if (body.trim().isEmpty) {
      return 'Falha ao registrar abastecimento: $statusCode';
    }

    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) {
        final message = decoded['message'];
        if (message is String && message.trim().isNotEmpty) {
          return message;
        }
      }
    } on Object {
      return 'Falha ao registrar abastecimento: $statusCode';
    }

    return 'Falha ao registrar abastecimento: $statusCode';
  }
}
