import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/admin_service.dart';
import 'package:google_fonts/google_fonts.dart';

class AdminSiteSettingsScreen extends StatefulWidget {
  const AdminSiteSettingsScreen({super.key});

  @override
  State<AdminSiteSettingsScreen> createState() => _AdminSiteSettingsScreenState();
}

class _AdminSiteSettingsScreenState extends State<AdminSiteSettingsScreen> {
  final AdminService _adminService = AdminService();
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _whatsappController;
  late TextEditingController _referralController;
  late TextEditingController _pointsCediController;
  late TextEditingController _usdtRateController;
  
  bool _isLoading = true;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _emailController = TextEditingController();
    _whatsappController = TextEditingController();
    _referralController = TextEditingController();
    _pointsCediController = TextEditingController();
    _usdtRateController = TextEditingController();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final result = await _adminService.fetchSettingsAdmin();
    if (mounted) {
      if (result['success']) {
        final s = result['settings'];
        setState(() {
          _nameController.text = s?['siteName'] ?? "Card Hive";
          _emailController.text = s?['contactEmail'] ?? "";
          _whatsappController.text = s?['whatsappNumber'] ?? "";
          _referralController.text = (s?['referralBonusPercentage'] ?? 1.5).toString();
          _pointsCediController.text = (s?['rewardPointsToGhs'] ?? 100).toString();
          _usdtRateController.text = (s?['usdtExchangeRate'] ?? 15.0).toString();
          _isLoading = false;
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['error'] ?? "Failed to load")));
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _saveSettings() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    final data = {
      'siteName': _nameController.text,
      'contactEmail': _emailController.text,
      'whatsappNumber': _whatsappController.text,
      'referralBonusPercentage': double.parse(_referralController.text),
      'rewardPointsToGhs': double.parse(_pointsCediController.text),
      'usdtExchangeRate': double.parse(_usdtRateController.text),
    };

    final result = await _adminService.updateSettings(data);
    if (mounted) {
      if (result['success']) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Settings updated successfully!"), backgroundColor: Colors.green));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['error'] ?? "Update failed")));
      }
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text("Site Settings", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [
          if (!_isLoading)
            IconButton(
              onPressed: _isSaving ? null : _saveSettings,
              icon: _isSaving 
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2563EB)))
                : const Icon(Icons.check_rounded, color: Color(0xFF2563EB)),
            ),
        ],
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                   _buildSection(
                    title: "Branding & Contact",
                    icon: Icons.branding_watermark_outlined,
                    isDark: isDark,
                    children: [
                      _buildTextField("Site Name", _nameController, isDark),
                      const SizedBox(height: 16),
                      _buildTextField("Support Email", _emailController, isDark, type: TextInputType.emailAddress),
                      const SizedBox(height: 16),
                      _buildTextField("WhatsApp Support Number", _whatsappController, isDark, type: TextInputType.phone),
                    ],
                  ),
                  const SizedBox(height: 24),
                  _buildSection(
                    title: "Rewards & Incentives",
                    icon: Icons.card_giftcard_rounded,
                    isDark: isDark,
                    children: [
                      _buildNumericField(
                        label: "Referral Bonus (%)", 
                        subtitle: "Percentage of referred user's first trade awarded to referrer.",
                        controller: _referralController, 
                        isDark: isDark,
                        suffix: "%",
                      ),
                      const SizedBox(height: 16),
                      _buildNumericField(
                        label: "100 Points Value (GHS)", 
                        subtitle: "The Cedi equivalent for every 100 Reward Points.",
                        controller: _pointsCediController, 
                        isDark: isDark,
                        suffix: "GHS",
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  _buildSection(
                    title: "Financial Rates",
                    icon: Icons.currency_exchange_rounded,
                    isDark: isDark,
                    children: [
                      _buildNumericField(
                        label: "USDT Exchange Rate", 
                        subtitle: "Global rate used for GHS to USDT conversions.",
                        controller: _usdtRateController, 
                        isDark: isDark,
                        suffix: "GHS",
                      ),
                    ],
                  ),
                  const SizedBox(height: 40),
                  ElevatedButton(
                    onPressed: _isSaving ? null : _saveSettings,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: _isSaving 
                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text("Save All Settings", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                ],
              ),
            ),
          ),
    );
  }

  Widget _buildSection({required String title, required IconData icon, required bool isDark, required List<Widget> children}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: const Color(0xFF2563EB)),
            const SizedBox(width: 8),
            Text(title, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: const Color(0xFF2563EB))),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
          ),
          child: Column(children: children),
        ),
      ],
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, bool isDark, {TextInputType type = TextInputType.text}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          keyboardType: type,
          validator: (v) => v!.isEmpty ? "Required" : null,
          style: GoogleFonts.outfit(fontSize: 14),
          decoration: InputDecoration(
            filled: true,
            fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.05),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
      ],
    );
  }

  Widget _buildNumericField({required String label, required String subtitle, required TextEditingController controller, required bool isDark, required String suffix}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
        Text(subtitle, style: const TextStyle(fontSize: 10, color: Colors.grey)),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          validator: (v) => v!.isEmpty ? "Required" : null,
          style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold),
          decoration: InputDecoration(
            filled: true,
            fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.05),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            suffixText: suffix,
            suffixStyle: const TextStyle(color: Colors.grey, fontWeight: FontWeight.bold, fontSize: 12),
          ),
        ),
      ],
    );
  }
}
