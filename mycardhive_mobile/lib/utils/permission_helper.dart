import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

class PermissionHelper {
  /// Unified method to check and request a specific permission with a custom UI message
  static Future<bool> requestPermission({
    required BuildContext context,
    required Permission permission,
    required String title,
    required String message,
  }) async {
    final status = await permission.request();

    if (status.isGranted || status.isLimited) {
      return true;
    }

    if (status.isPermanentlyDenied) {
      if (!context.mounted) return false;
      
      final bool? openSettings = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              const Icon(Icons.security_rounded, color: Color(0xFF2563EB)),
              const SizedBox(width: 10),
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text("Cancel", style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text("Open Settings", style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      );

      if (openSettings == true) {
        await openAppSettings();
      }
    }

    return false;
  }

  /// Specialized helper for Photos
  static Future<bool> requestPhotos(BuildContext context) async {
    // Modern ImagePicker on Android and iOS uses out-of-process system photo pickers 
    // which do not require declaring or requesting storage/photos permissions.
    // Manual checks here cause conflicts and failures on Android 14/15.
    return true;
  }

  /// Specialized helper for Camera
  static Future<bool> requestCamera(BuildContext context) async {
    return await requestPermission(
      context: context,
      permission: Permission.camera,
      title: "Camera Permission",
      message: "We need access to your camera to take live photos of your gift cards. Please enable it in Settings.",
    );
  }
}
