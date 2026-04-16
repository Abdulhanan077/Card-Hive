import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:gal/gal.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/material.dart';

class ImageUtils {
  static Future<void> saveNetworkImage(BuildContext context, String url) async {
    try {
      // 1. Request Permission
      PermissionStatus status;
      
      // On Android 13+ (SDK 33), we need to check for photos.
      // On older versions, we check for storage.
      status = await Permission.photos.request();
      
      if (!status.isGranted) {
        status = await Permission.storage.request();
      }

      if (!status.isGranted) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Permission denied. Enable gallery access in settings."), 
              backgroundColor: Colors.red,
              duration: Duration(seconds: 3),
            ),
          );
        }
        return;
      }

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Saving image..."), duration: Duration(milliseconds: 500)),
        );
      }

      // 2. Download Image
      var response = await Dio().get(
        url,
        options: Options(responseType: ResponseType.bytes),
      );

      // 3. Save to Gallery
      await Gal.putImageBytes(
        Uint8List.fromList(response.data),
        name: "CardHive_${DateTime.now().millisecondsSinceEpoch}",
      );

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Image saved to gallery!"), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Error saving image: $e"), backgroundColor: Colors.red),
        );
      }
    }
  }
}
