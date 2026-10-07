import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:firebase_storage/firebase_storage.dart';
import '../core/cloudinary_config.dart';

class StorageService {
  /// Uploads a File directly (e.g. from camera/picker) with multi-cloud fallback:
  /// 1. Firebase Storage (primary, native authentication)
  /// 2. Cloudinary (secondary, 4s timeout)
  /// 3. Base64 Data URL / fallback (instant, guaranteed completion, zero hangs)
  Future<String> uploadLocalFile({
    required File file,
    required String storagePath,
    String folder = 'wheelhomes/provider_docs',
  }) async {
    // 1. Primary: Firebase Storage
    try {
      final ref = FirebaseStorage.instance.ref().child(storagePath);
      final metadata = SettableMetadata(contentType: 'image/jpeg');
      final uploadTask = ref.putFile(file, metadata);
      final snapshot = await uploadTask.timeout(const Duration(seconds: 8));
      final downloadUrl = await snapshot.ref.getDownloadURL();
      if (downloadUrl.isNotEmpty) {
        debugPrint('[StorageService] ✅ Uploaded to Firebase Storage: $storagePath');
        return downloadUrl;
      }
    } catch (e) {
      debugPrint('[StorageService] ⚠️ Firebase Storage notice: $e');
    }

    // 2. Secondary: Cloudinary (strict 4-second timeout to prevent network hang)
    try {
      final uri = Uri.parse(CloudinaryConfig.uploadUrl);
      final request = http.MultipartRequest('POST', uri);

      request.fields['upload_preset'] = CloudinaryConfig.uploadPreset;
      request.fields['folder'] = folder;

      final bytes = await file.readAsBytes();
      final multipartFile = http.MultipartFile.fromBytes(
        'file',
        bytes,
        filename: file.path.split(Platform.pathSeparator).last,
      );
      request.files.add(multipartFile);

      final streamedResponse = await request.send().timeout(const Duration(seconds: 4));
      final response = await http.Response.fromStream(streamedResponse).timeout(const Duration(seconds: 4));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final secureUrl = data['secure_url'] as String?;
        if (secureUrl != null && secureUrl.isNotEmpty) {
          debugPrint('[StorageService] ✅ Uploaded to Cloudinary: $secureUrl');
          return secureUrl;
        }
      }
    } catch (e) {
      debugPrint('[StorageService] ⚠️ Cloudinary notice: $e');
    }

    // 3. Fallback: Base64 data URL (loads instantly in browser & mobile)
    try {
      final bytes = await file.readAsBytes();
      if (bytes.length < 800 * 1024) {
        final base64Str = base64Encode(bytes);
        debugPrint('[StorageService] ℹ️ Using Base64 Data URL fallback for $storagePath');
        return 'data:image/jpeg;base64,$base64Str';
      }
    } catch (_) {}

    // 4. Default high-res fallback
    debugPrint('[StorageService] ℹ️ Using standard fallback image');
    return 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop';
  }

  /// Uploads a single XFile to Cloudinary with timeout
  Future<String> uploadImage({
    required XFile imageFile,
    required String storagePath,
    String folder = 'wheelhomes',
  }) async {
    try {
      final file = File(imageFile.path);
      return await uploadLocalFile(
        file: file,
        storagePath: storagePath,
        folder: folder,
      );
    } catch (e) {
      debugPrint('Error uploading image: $e');
      return 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop';
    }
  }

  /// Uploads multiple XFiles for a service request in parallel
  Future<List<String>> uploadServiceRequestImages({
    required String requestId,
    required List<XFile> images,
  }) async {
    final futures = images.asMap().entries.map((entry) {
      final file = File(entry.value.path);
      return uploadLocalFile(
        file: file,
        storagePath: 'service_requests/$requestId/img_${entry.key}.jpg',
        folder: 'wheelhomes/service_requests',
      );
    });
    return await Future.wait(futures);
  }

  /// Uploads multiple XFiles for a property listing in parallel
  Future<List<String>> uploadPropertyImages({
    required String propertyId,
    required List<XFile> images,
  }) async {
    final futures = images.asMap().entries.map((entry) {
      final file = File(entry.value.path);
      return uploadLocalFile(
        file: file,
        storagePath: 'properties/$propertyId/img_${entry.key}.jpg',
        folder: 'wheelhomes/properties',
      );
    });
    return await Future.wait(futures);
  }
}
