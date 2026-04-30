import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/settings_service.dart';
import 'package:provider/provider.dart';
import 'package:mycardhive_mobile/providers/theme_provider.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:mycardhive_mobile/services/biometric_service.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:mycardhive_mobile/ui/screens/home_screen.dart';
import 'package:mycardhive_mobile/utils/error_utils.dart';
import 'package:mycardhive_mobile/ui/screens/login_screen.dart';
import 'package:mycardhive_mobile/utils/compliance_utils.dart';


class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final SettingsService _settingsService = SettingsService();
  final AuthService _authService = AuthService();
  bool _isLoading = true;
  bool _isSaving = false;

  Map<String, dynamic>? _user;
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _currentPasswordController = TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  bool _emailNotifications = false;
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  
  bool _canCheckBiometrics = false;
  bool _biometricsEnabled = false;

  @override
  void initState() {
    super.initState();
    _fetchSettings();
    _checkBiometricSupport();
  }

  Future<void> _checkBiometricSupport() async {
    final canCheck = await BiometricService.canCheckBiometrics();
    final enabled = await _authService.isBiometricsEnabled();
    setState(() {
      _canCheckBiometrics = canCheck;
      _biometricsEnabled = enabled;
    });
  }

  Future<void> _fetchSettings() async {
    try {
      final data = await _settingsService.getSettings();
      setState(() {
        _user = data;
        _nameController.text = _user?['username'] ?? '';
        _emailNotifications = _user?['emailNotificationsEnabled'] ?? false;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(ErrorUtils.getFriendlyErrorMessage(e)), 
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
          )
        );
      }
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _isSaving = true);
    final success = await _settingsService.updateSettings(username: _nameController.text);
    setState(() => _isSaving = false);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Profile updated successfully!"), backgroundColor: Color(0xFF10B981)));
    }
  }

  Future<void> _updatePassword() async {
    if (_currentPasswordController.text.isEmpty || _newPasswordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Please fill all password fields"), backgroundColor: Colors.red));
      return;
    }
    setState(() => _isSaving = true);
    // Simulate web delay for now
    await Future.delayed(const Duration(seconds: 1));
    setState(() {
      _isSaving = false;
      _currentPasswordController.clear();
      _newPasswordController.clear();
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Password updated successfully!"), backgroundColor: Color(0xFF10B981)));
    }
  }

  Future<void> _toggleNotifications(bool value) async {
    setState(() => _emailNotifications = value);
    final success = await _settingsService.updateSettings(emailNotifications: value);
    if (!success && mounted) {
      setState(() => _emailNotifications = !value);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Failed to update preferences"), backgroundColor: Colors.red));
    }
  }

  Future<void> _toggleBiometrics(bool value) async {
    if (value) {
      // 1. Check if biometrics are enrolled
      final enrolled = await BiometricService.isBiometricEnrolled();
      if (!enrolled) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text("No biometrics enrolled. Please set up FaceID/TouchID in system settings."),
            backgroundColor: Colors.orange,
          ));
        }
        return;
      }

      // 2. Prompt for authentication
      final authenticated = await BiometricService.authenticate();
      if (!authenticated) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text("Biometric authentication failed."),
            backgroundColor: Colors.redAccent,
          ));
        }
        return;
      }
    }
    
    await _authService.setBiometricsEnabled(value);
    setState(() => _biometricsEnabled = value);
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(value ? "Biometric login enabled" : "Biometric login disabled"),
        backgroundColor: const Color(0xFF10B981),
      ));
    }
  }

  Future<void> _confirmAccountDeletion() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Delete Account?", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
        content: const Text(
          "This action is permanent. Your personal information will be cleared, and you will be logged out. Your trade history will be kept for auditing purposes but disconnected from your PII.",
          style: TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text("Delete Account", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      setState(() => _isSaving = true);
      final result = await _authService.deleteAccount();
      setState(() => _isSaving = false);

      if (result['success'] == true) {
        if (mounted) {
          // Navigate to home screen and clear history
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (context) => const HomeScreen()),
            (route) => false
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['error'] ?? "Failed to delete account"), backgroundColor: Colors.red));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final themeProvider = Provider.of<ThemeProvider>(context);
    final isDark = themeProvider.themeMode == ThemeMode.dark;
    final bgColor = isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC);
    final cardColor = isDark ? const Color(0xFF1E293B) : Colors.white;
    final textColor = isDark ? Colors.white : const Color(0xFF0F172A);
    final subTextColor = isDark ? Colors.white70 : const Color(0xFF64748B);
    final borderColor = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);

    final avatarLetter = (_user?['username'] ?? "U").substring(0, 1).toUpperCase();

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: Text("Profile Settings", style: TextStyle(color: textColor, fontWeight: FontWeight.bold)),
        backgroundColor: cardColor,
        elevation: 1,
        centerTitle: true,
        leading: IconButton(icon: Icon(Icons.arrow_back_ios_new, color: textColor), onPressed: () => Navigator.pop(context)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            if (_user?['status'] == 'DELETED')
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(color: Colors.red.withOpacity(0.1), borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.red)),
                child: const Text("This account is scheduled for deletion.", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
              ),
            // Top Profile Card
            _buildProfileHeader(avatarLetter, cardColor, textColor, subTextColor, borderColor),
            const SizedBox(height: 16),
            
            // Profile Info Form
            _buildSection(
              title: "Profile Information",
              subtitle: "Update your account's profile information.",
              icon: Icons.person_outline,
              cardColor: cardColor,
              textColor: textColor,
              subTextColor: subTextColor,
              borderColor: borderColor,
              child: Column(
                children: [
                  _buildTextField("Full Name", _nameController, isDark, borderColor),
                  const SizedBox(height: 12),
                  _buildReadOnlyField("Email Address", _user?['email'] ?? '', isDark, borderColor),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isSaving ? null : _saveProfile,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: _isSaving 
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text("Save Changes", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            _buildSection(
              title: "Update Password",
              subtitle: "Ensure your account is using a long, random password to stay secure.",
              icon: Icons.lock_outline,
              cardColor: cardColor,
              textColor: textColor,
              subTextColor: subTextColor,
              borderColor: borderColor,
              child: Column(
                children: [
                  _buildPasswordField("Current Password", _currentPasswordController, _obscureCurrent, (val) => setState(() => _obscureCurrent = !val), isDark, borderColor),
                  const SizedBox(height: 12),
                  _buildPasswordField("New Password", _newPasswordController, _obscureNew, (val) => setState(() => _obscureNew = !val), isDark, borderColor),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isSaving ? null : _updatePassword,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text("Save Changes", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Appearance
            _buildSection(
              title: "Appearance",
              subtitle: "Customize how the application looks for you.",
              icon: Icons.brightness_4_outlined,
              cardColor: cardColor,
              textColor: textColor,
              subTextColor: subTextColor,
              borderColor: borderColor,
              child: SwitchListTile(
                title: Text("Dark Mode", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: textColor)),
                secondary: Icon(isDark ? Icons.nightlight_round : Icons.wb_sunny_rounded, size: 20, color: const Color(0xFF6366F1)),
                value: isDark,
                activeColor: const Color(0xFF10B981),
                onChanged: (val) => themeProvider.toggleTheme(val),
                contentPadding: EdgeInsets.zero,
              ),
            ),
            const SizedBox(height: 16),

            // Notifications
            _buildSection(
              title: "Notifications & Background",
              subtitle: "Ensure you never miss a trade update or message.",
              icon: Icons.notifications_none,
              cardColor: cardColor,
              textColor: textColor,
              subTextColor: subTextColor,
              borderColor: borderColor,
              child: Column(
                children: [
                   SwitchListTile(
                    title: Text("Trade Updates", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: textColor)),
                    subtitle: Text("Receive email notifications when your trade status changes.", style: TextStyle(fontSize: 11, color: subTextColor)),
                    value: _emailNotifications,
                    activeColor: const Color(0xFF10B981),
                    onChanged: _toggleNotifications,
                    contentPadding: EdgeInsets.zero,
                  ),
                  Divider(height: 24, color: borderColor),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.battery_saver_rounded, color: Colors.orange, size: 20),
                    title: const Text("High Performance Mode", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    subtitle: const Text("Keep notifications active even when app is closed", style: TextStyle(fontSize: 10, color: Colors.grey)),
                    trailing: OutlinedButton(
                      onPressed: () async {
                         if (await Permission.ignoreBatteryOptimizations.request().isGranted) {
                           if (mounted) {
                             ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                               content: Text("Battery optimization disabled."),
                               backgroundColor: Colors.green,
                             ));
                           }
                        } else {
                           await openAppSettings();
                        }
                      },
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text("Enable", style: TextStyle(fontSize: 12)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

              _buildSection(
                title: "Security & Sessions",
                subtitle: "Protect your account and manage active sessions.",
                icon: Icons.security_outlined,
                cardColor: cardColor,
                textColor: textColor,
                subTextColor: subTextColor,
                borderColor: borderColor,
                child: Column(
                  children: [
                    if (_canCheckBiometrics) ...[
                      SwitchListTile(
                        title: Text("Biometric Login", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: textColor)),
                        subtitle: Text("Use Fingerprint or FaceID for faster access.", style: TextStyle(fontSize: 11, color: subTextColor)),
                        secondary: Icon(Icons.fingerprint, size: 20, color: const Color(0xFF6366F1)),
                        value: _biometricsEnabled,
                        activeColor: const Color(0xFF10B981),
                        onChanged: _toggleBiometrics,
                        contentPadding: EdgeInsets.zero,
                      ),
                      Divider(height: 32, color: borderColor),
                    ],
                    Row(
                      children: [
                        Icon(Icons.devices, size: 16, color: subTextColor),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("Current Session", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: textColor)),
                            Text("This device: Android Core (Active Now)", style: TextStyle(fontSize: 11, color: const Color(0xFF10B981))),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
            ),
            const SizedBox(height: 16),

            // Account Overview
            _buildSection(
              title: "Account Overview",
              subtitle: "Summary of your account status.",
              icon: Icons.info_outline,
              cardColor: cardColor,
              textColor: textColor,
              subTextColor: subTextColor,
              borderColor: borderColor,
              child: Column(
                children: [
                  _buildInfoRow("Member Since", _user?['memberSince'] ?? 'N/A', Icons.calendar_today, subTextColor, textColor),
                  Divider(height: 24, color: borderColor),
                  _buildInfoRow("Status", "Verified", Icons.check_circle, subTextColor, textColor, valueColor: const Color(0xFF10B981)),
                  Divider(height: 24, color: borderColor),
                  _buildInfoRow("Referral Code", _user?['referralCode'] ?? 'N/A', Icons.label_outline, subTextColor, textColor, valueColor: const Color(0xFFDB2777)),
                ],
              ),
            ),
            const SizedBox(height: 32),

            const SizedBox(height: 16),
            
            // Danger Zone
            _buildSection(
              title: "Danger Zone",
              subtitle: "Irreversible actions for your account.",
              icon: Icons.warning_amber_rounded,
              cardColor: cardColor,
              textColor: Colors.red,
              subTextColor: subTextColor,
              borderColor: Colors.red.withOpacity(0.3),
              child: Column(
                children: [
                   ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text("Delete My Account", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.red)),
                    subtitle: const Text("Permanently remove your personal data and trade associations.", style: TextStyle(fontSize: 11, color: Colors.grey)),
                    trailing: OutlinedButton(
                      onPressed: _isSaving ? null : _confirmAccountDeletion,
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.red),
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text("Delete", style: TextStyle(fontSize: 12, color: Colors.red)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Logout Button
            TextButton.icon(
              onPressed: () {
                _logout();
              },
              icon: const Icon(Icons.logout, color: Colors.red),
              label: const Text("Log Out", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Future<void> _logout() async {
    await _authService.logout();
    if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const HomeScreen()),
          (route) => false
        );
    }
  }

  Widget _buildProfileHeader(String initial, Color cardColor, Color textColor, Color subTextColor, Color borderColor) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: cardColor, borderRadius: BorderRadius.circular(16), border: Border.all(color: borderColor)),
      child: Row(
        children: [
          CircleAvatar(
            radius: 40,
            backgroundColor: const Color(0xFF6366F1),
            child: Text(initial, style: const TextStyle(fontSize: 32, color: Colors.white, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_user?['username'] ?? '', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: textColor)),
                const SizedBox(height: 4),
                Text(_user?['email'] ?? '', style: TextStyle(color: subTextColor, fontSize: 13)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0xFFD1FAE5), borderRadius: BorderRadius.circular(4)),
                  child: const Text("Verified Account", style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildSection({required String title, required String subtitle, required IconData icon, required Widget child, required Color cardColor, required Color textColor, required Color subTextColor, required Color borderColor}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: cardColor, borderRadius: BorderRadius.circular(16), border: Border.all(color: borderColor)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: const Color(0xFF6366F1)),
              const SizedBox(width: 8),
              Text(title, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: textColor)),
            ],
          ),
          const SizedBox(height: 4),
          Text(subtitle, style: TextStyle(fontSize: 12, color: subTextColor)),
          const SizedBox(height: 20),
          child,
        ],
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, bool isDark, Color borderColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          style: TextStyle(color: isDark ? Colors.white : Colors.black),
          decoration: InputDecoration(
            isDense: true,
            filled: true,
            fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: borderColor)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: borderColor)),
          ),
        ),
      ],
    );
  }

  Widget _buildPasswordField(String label, TextEditingController controller, bool obscure, Function(bool) onToggle, bool isDark, Color borderColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          obscureText: obscure,
          style: TextStyle(color: isDark ? Colors.white : Colors.black),
          decoration: InputDecoration(
            isDense: true,
            filled: true,
            fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
            suffixIcon: IconButton(
              icon: Icon(obscure ? Icons.visibility_off : Icons.visibility, size: 18, color: isDark ? Colors.white70 : Colors.grey),
              onPressed: () => onToggle(obscure),
            ),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: borderColor)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: borderColor)),
          ),
        ),
      ],
    );
  }

  Widget _buildReadOnlyField(String label, String value, bool isDark, Color borderColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(color: isDark ? const Color(0xFF334155).withOpacity(0.5) : const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8), border: Border.all(color: borderColor)),
          child: Text(value, style: TextStyle(color: isDark ? Colors.white54 : const Color(0xFF94A3B8))),
        ),
      ],
    );
  }

  Widget _buildInfoRow(String label, String value, IconData icon, Color subTextColor, Color textColor, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: subTextColor),
            const SizedBox(width: 12),
            Text(label, style: TextStyle(color: subTextColor, fontSize: 13)),
          ],
        ),
        Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: valueColor ?? textColor)),
      ],
    );
  }
}
