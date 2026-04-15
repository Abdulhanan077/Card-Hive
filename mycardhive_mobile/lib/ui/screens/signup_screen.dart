import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:mycardhive_mobile/ui/screens/dashboard_screen.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _referralController = TextEditingController();
  final _otpController = TextEditingController();
  
  final _authService = AuthService();
  
  bool _isLoading = false;
  bool _isSendingOTP = false;
  bool _otpSent = false;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  Future<void> _handleSendOTP() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter your email first'), backgroundColor: Colors.red));
      return;
    }

    setState(() => _isSendingOTP = true);
    final username = _usernameController.text.trim();
    final result = await _authService.sendOTP(email, username);
    setState(() {
      _isSendingOTP = false;
      if (result['success']) _otpSent = true;
    });

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(result['success'] ? result['message'] : result['error']), backgroundColor: result['success'] ? Colors.green : Colors.red),
    );
  }

  Future<void> _handleSignup() async {
    final username = _usernameController.text.trim();
    final email = _emailController.text.trim();
    final phone = _phoneController.text.trim();
    final password = _passwordController.text;
    final confirm = _confirmPasswordController.text;
    final referral = _referralController.text.trim();
    final otp = _otpController.text.trim();

    if (username.isEmpty || email.isEmpty || phone.isEmpty || password.isEmpty || confirm.isEmpty || otp.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill out all required fields, including the OTP'), backgroundColor: Colors.red),
      );
      return;
    }

    if (password != confirm) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Passwords do not match'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _isLoading = true);

    final result = await _authService.signup(username, email, phone, password, confirm, referral, otp);

    setState(() => _isLoading = false);

    if (!mounted) return;

    if (result['success']) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Account created! Welcome, ${result['user']['username']}!'), backgroundColor: Colors.green),
      );
      Navigator.pushAndRemoveUntil(
        context, 
        MaterialPageRoute(builder: (context) => DashboardScreen(user: result['user'])), 
        (route) => false,
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['error']), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // Sync parity with global.css --background
      appBar: AppBar(
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
            child: Container(
              // The exact "authCard" CSS recreation
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFFFF), // --surface
                borderRadius: BorderRadius.circular(12), // --radius-lg
                border: Border.all(color: const Color(0xFFE2E8F0)), // --border
                boxShadow: const [
                  // --shadow-sm
                  BoxShadow(color: Color(0x0D000000), offset: Offset(0, 1), blurRadius: 2)
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Sparkle Icon Wrapper
                  Align(
                    alignment: Alignment.center,
                    child: Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9), // surface-hover
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(
                        child: Text("✨", style: TextStyle(fontSize: 24)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Header
                  const Text(
                    "Create an Account",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    "Join Card Hive to start trading securely",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 15, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 32),
                  
                  // Form Fields mapped directly to Web PARITY
                  _buildLabel("Username"),
                  _buildTextField(controller: _usernameController, hint: "Choose a username"),

                  const SizedBox(height: 20),
                  _buildLabel("Email"),
                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: _buildTextField(controller: _emailController, hint: "you@example.com", enabled: !_otpSent),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 1,
                        child: SizedBox(
                          height: 52,
                          child: ElevatedButton(
                            onPressed: _isSendingOTP ? null : _handleSendOTP,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFF1F5F9),
                              foregroundColor: const Color(0xFF2563EB),
                              elevation: 0,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              side: const BorderSide(color: Color(0xFFE2E8F0)),
                              padding: EdgeInsets.zero,
                            ),
                            child: _isSendingOTP
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                                : Text(_otpSent ? "Resend" : "Send Code", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          ),
                        ),
                      ),
                    ],
                  ),
                  
                  if (_otpSent) ...[
                    const SizedBox(height: 20),
                    _buildLabel("Verification Code (OTP)"),
                    _buildTextField(controller: _otpController, hint: "Enter 6-digit code"),
                  ],
                  
                  const SizedBox(height: 20),
                  _buildLabel("Phone Number (MTN/Telecel)"),
                  _buildTextField(controller: _phoneController, hint: "e.g. +233 55 123 4567"),
                  
                  const SizedBox(height: 20),
                  _buildLabel("Password"),
                  _buildPasswordField(controller: _passwordController, obscure: _obscurePassword, onToggle: () => setState(() => _obscurePassword = !_obscurePassword)),
                  
                  const SizedBox(height: 20),
                  _buildLabel("Confirm Password"),
                  _buildPasswordField(controller: _confirmPasswordController, hint: "Repeat password", obscure: _obscureConfirm, onToggle: () => setState(() => _obscureConfirm = !_obscureConfirm)),
                  
                  const SizedBox(height: 20),
                  _buildLabel("Referral Code (Optional)"),
                  _buildTextField(controller: _referralController, hint: "Did someone invite you?"),
                  
                  const SizedBox(height: 32),
                  
                  SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _handleSignup,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        elevation: 0,
                      ),
                      child: _isLoading
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text("Create Account", style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(
        text,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF0F172A)),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    bool enabled = true,
  }) {
    return TextField(
      controller: controller,
      enabled: enabled,
      style: const TextStyle(fontSize: 15),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
        filled: true,
        fillColor: enabled ? const Color(0xFFF8FAFC) : const Color(0xFFF1F5F9),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2)),
        disabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1)),
      ),
    );
  }

  Widget _buildPasswordField({
    required TextEditingController controller,
    String hint = "••••••••",
    required bool obscure,
    required VoidCallback onToggle,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      style: const TextStyle(fontSize: 15),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        suffixIcon: Padding(
          padding: const EdgeInsets.only(right: 8.0),
          child: TextButton(
             onPressed: onToggle,
             style: TextButton.styleFrom(
               minimumSize: Size.zero,
               padding: const EdgeInsets.all(8),
               tapTargetSize: MaterialTapTargetSize.shrinkWrap,
             ),
             child: Text(obscure ? "👁️" : "👁️‍🗨️", style: const TextStyle(fontSize: 18)),
          ),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2)),
      ),
    );
  }
}
