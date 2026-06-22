import 'package:geolocator/geolocator.dart';

class GeoPoint {
  const GeoPoint({required this.latitude, required this.longitude});

  final double latitude;
  final double longitude;
}

abstract class LocationService {
  Future<GeoPoint> currentLocation();
}

class DeviceLocationService implements LocationService {
  const DeviceLocationService();

  @override
  Future<GeoPoint> currentLocation() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw const LocationServiceException('GPS desligado no aparelho.');
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw const LocationServiceException('Permissao de localizacao negada.');
    }

    final position = await Geolocator.getCurrentPosition();
    return GeoPoint(latitude: position.latitude, longitude: position.longitude);
  }
}

class LocationServiceException implements Exception {
  const LocationServiceException(this.message);

  final String message;
}
