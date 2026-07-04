import 'dart:io';

import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

import 'admin_api_client.dart';

class PdfOpenException implements Exception {
  const PdfOpenException();
}

class PdfFileService {
  const PdfFileService();

  Future<void> open(AdminDownloadedFile file) async {
    final directory = await getTemporaryDirectory();
    final safeName = file.filename.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '-');
    final output = File('${directory.path}${Platform.pathSeparator}$safeName');
    await output.writeAsBytes(file.bytes, flush: true);
    final result = await OpenFilex.open(output.path, type: 'application/pdf');
    if (result.type != ResultType.done) {
      throw const PdfOpenException();
    }
  }
}
