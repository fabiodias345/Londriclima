import 'package:image_picker/image_picker.dart';

import '../models/work_order.dart';

class DeviceChecklistPhotoPicker implements ChecklistPhotoPicker {
  const DeviceChecklistPhotoPicker();

  @override
  Future<ChecklistPhotoFile?> pickPhoto() async {
    final image = await ImagePicker().pickImage(
      source: ImageSource.camera,
      imageQuality: 72,
      maxWidth: 1600,
    );

    if (image == null) {
      return null;
    }

    final bytes = await image.readAsBytes();
    return ChecklistPhotoFile(
      filename: image.name,
      mimeType: image.mimeType ?? 'image/jpeg',
      bytes: bytes,
    );
  }
}
