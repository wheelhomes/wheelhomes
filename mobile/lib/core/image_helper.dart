import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class SafeImageHelper {
  /// Renders images resiliently from HTTP(S) URLs or Base64 data URLs.
  static Widget buildImage(
    String? url, {
    BoxFit fit = BoxFit.cover,
    double? width,
    double? height,
    Widget? placeholder,
    Widget? errorWidget,
  }) {
    if (url == null || url.trim().isEmpty) {
      return errorWidget ??
          Container(
            width: width,
            height: height,
            color: Colors.grey[200],
            child: const Center(
              child: Icon(LucideIcons.user, size: 24, color: Colors.grey),
            ),
          );
    }

    final trimmed = url.trim();

    // Support Base64 Data URLs (e.g. uploaded from Web)
    if (trimmed.startsWith('data:image')) {
      try {
        final commaIdx = trimmed.indexOf(',');
        final base64String = commaIdx != -1 ? trimmed.substring(commaIdx + 1) : trimmed;
        final bytes = base64Decode(base64String);
        return Image.memory(
          bytes,
          fit: fit,
          width: width,
          height: height,
          errorBuilder: (_, __, ___) =>
              errorWidget ??
              Container(
                width: width,
                height: height,
                color: Colors.grey[200],
                child: const Center(
                  child: Icon(LucideIcons.fileWarning, size: 24, color: Colors.grey),
                ),
              ),
        );
      } catch (e) {
        return errorWidget ??
            Container(
              width: width,
              height: height,
              color: Colors.grey[200],
              child: const Center(
                child: Icon(LucideIcons.fileWarning, size: 24, color: Colors.grey),
              ),
            );
      }
    }

    // Standard HTTP(S) URL
    return Image.network(
      trimmed,
      fit: fit,
      width: width,
      height: height,
      errorBuilder: (_, __, ___) =>
          errorWidget ??
          Container(
            width: width,
            height: height,
            color: Colors.grey[200],
            child: const Center(
              child: Icon(LucideIcons.fileWarning, size: 24, color: Colors.grey),
            ),
          ),
    );
  }
}
