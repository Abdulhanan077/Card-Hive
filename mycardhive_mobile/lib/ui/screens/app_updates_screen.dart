import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mycardhive_mobile/services/update_service.dart';
import 'package:restart_app/restart_app.dart';

class AppUpdatesScreen extends StatelessWidget {
  const AppUpdatesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final updateService = Provider.of<UpdateService>(context);
    final textColor = theme.colorScheme.onSurface;
    final subTextColor = isDark ? Colors.white70 : const Color(0xFF64748B);
    final cardColor = theme.cardColor;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text("App Updates", style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        elevation: 1,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: cardColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: theme.dividerColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  const Icon(Icons.system_update_outlined, color: Color(0xFF6366F1)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Check for and install application updates.",
                      style: TextStyle(fontSize: 14, color: subTextColor),
                    ),
                  ),
                ],
              ),
              const Divider(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info_outline, size: 16, color: subTextColor),
                      const SizedBox(width: 12),
                      Text("App Version", style: TextStyle(color: subTextColor, fontSize: 13)),
                    ],
                  ),
                  Text(
                    "1.0.2${updateService.currentPatch != null ? ' (Patch ${updateService.currentPatch})' : ''}",
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              if (updateService.isChecking) ...[
                Row(
                  children: [
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    const SizedBox(width: 12),
                    Text("Checking for updates...", style: TextStyle(color: subTextColor, fontSize: 13)),
                  ],
                ),
              ] else if (updateService.isDownloading) ...[
                Row(
                  children: [
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    const SizedBox(width: 12),
                    Text("Downloading update...", style: TextStyle(color: subTextColor, fontSize: 13)),
                  ],
                ),
              ] else if (updateService.updateAvailable) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF10B981)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.check_circle_outline, color: Color(0xFF10B981)),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              "Update downloaded and ready!", 
                              style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () => Restart.restartApp(),
                          icon: const Icon(Icons.restart_alt),
                          label: const Text("Restart App to Apply"),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ] else if (updateService.newPatchAvailable) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF2563EB)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.download, color: Color(0xFF2563EB)),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              "New patch available for download!", 
                              style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () async {
                            final success = await updateService.downloadAndInstall();
                            if (!success) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text("Failed to download update. Please try again.")),
                              );
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            foregroundColor: Colors.white,
                          ),
                          child: const Text("Download & Install Update"),
                        ),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text("App is up to date.", style: TextStyle(color: subTextColor, fontSize: 13)),
                    OutlinedButton(
                      onPressed: () async {
                        final available = await updateService.checkForUpdates();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(available 
                                ? "New update available!" 
                                : "App is already up to date."),
                            backgroundColor: available ? const Color(0xFF2563EB) : Colors.green,
                          ),
                        );
                      },
                      child: const Text("Check for Updates"),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
