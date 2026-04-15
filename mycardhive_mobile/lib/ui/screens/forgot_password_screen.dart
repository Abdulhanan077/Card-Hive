import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _authService = AuthService();
  
  bool _isSendingCode = false;
  bool _isResetting = false;
  bool _codeSent = false;
  bool _obscurePassword = true;

  Future<void> _handleSendCode() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter your email'), backgroundColor: Colors.red));
      return;
    }

    setState(() => _isSendingCode = true);
    final result = await _authService.forgotPassword(email);
    
    setState(() {
      _isSendingCode = false;
      if (result['success']) _codeSent = true;
    });

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(result['success'] ? result['message'] : result['error']), backgroundColor: result['success'] ? Colors.green : Colors.red),
    );
  }

  Future<void> _handleResetPassword() async {
    final email = _emailController.text.trim();
    final otp = _otpController.text.trim();
    final newPassword = _newPasswordController.text;

    if (otp.isEmpty || newPassword.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill out the OTP and new password'), backgroundColor: Colors.red));
      return;
    }

    setState(() => _isResetting = true);
    final result = await _authService.resetPassword(email, otp, newPassword);
    setState(() => _isResetting = false);

    if (!mounted) return;
    
    if (result['success']) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message']), backgroundColor: Colors.green),
      );
      Navigator.pop(context); // Go back to login screen
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['error']), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: Colors.orange[50], 
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Icon(Icons.lock_reset, size: 40, color: Colors.orange),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                "Reset Password",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF0F172A), letterSpacing: -0.5),
              ),
              const SizedBox(height: 8),
              const Text(
                "Securely reset your account password",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 15, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 40),

              _buildLabel("Email Address"),
              _buildTextField(controller: _emailController, hint: "Enter your account email", enabled: !_codeSent),

              if (!_codeSent) ...[
                const SizedBox(height: 30),
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _isSendingCode ? null : _handleSendCode,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      elevation: 0,
                    ),
                    child: _isSendingCode
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text("Send Reset Code", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
                  ),
                ),
              ] else ...[
                const SizedBox(height: 20),
                _buildLabel("Verification Code (OTP)"),
                _buildTextField(controller: _otpController, hint: "Enter 6-digit code"),
                
                const SizedBox(height: 20),
                _buildLabel("New Password"),
                _buildPasswordField(),
                
                const SizedBox(height: 40),
                
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _isResetting ? null : _handleResetPassword,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      elevation: 0,
                    ),
                    child: _isResetting
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text("Update Password", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
                  ),
                ),
              ],
            ],
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
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1E293B)),
      ),
    );
  }

  Widget _buildTextField({required TextEditingController controller, required String hint, bool enabled = true}) {
    return TextField(
      controller: controller,
      enabled: enabled,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
        filled: true,
        fillColor: enabled ? const Color(0xFFF8FAFC) : const Color(0xFFF1F5F9),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5)),
        disabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1)),
      ),
    );
  }

  Widget _buildPasswordField() {
    return TextField(
      controller: _newPasswordController,
      obscureText: _obscurePassword,
      decoration: InputDecoration(
        hintText: "••••••••",
        hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        suffixIcon: IconButton(
          icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, color: const Color(0xFF94A3B8), size: 20),
          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5)),
      ),
    );
  }
}
