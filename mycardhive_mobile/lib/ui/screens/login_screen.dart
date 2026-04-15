import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:mycardhive_mobile/ui/screens/signup_screen.dart';
import 'package:mycardhive_mobile/ui/screens/dashboard_screen.dart';
import 'package:mycardhive_mobile/ui/screens/forgot_password_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _authService = AuthService();
  
  bool _isLoading = false;
  bool _obscurePassword = true;

  Future<void> _handleLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter email and password'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _isLoading = true);

    final result = await _authService.login(email, password);

    setState(() => _isLoading = false);

    if (!mounted) return;

    if (result['success']) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Welcome back, ${result['user']['username']}!'), backgroundColor: Colors.green),
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
                  // Icon Wrapper Parity
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
                        child: Text("🔒", style: TextStyle(fontSize: 24)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    "Welcome Back",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    "Sign in to Card Hive to track your trades",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 15, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 32),
                  
                  _buildLabel("Username or Email"),
                  _buildTextField(
                    controller: _emailController,
                    hint: "Enter username or email",
                  ),
                  
                  const SizedBox(height: 20),
                  
                  _buildLabel("Password"),
                  _buildPasswordField(),
                  
                  const SizedBox(height: 6),
                  
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () {
                        Navigator.push(context, MaterialPageRoute(builder: (context) => const ForgotPasswordScreen()));
                      },
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: const Size(50, 30),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        alignment: Alignment.centerRight,
                      ),
                      child: const Text("Forgot Password?", style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w500, fontSize: 13)),
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _handleLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        elevation: 0, // Disable material default
                        shadowColor: Colors.transparent,
                      ),
                      child: _isLoading
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text("Sign In", style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white)),
                    ),
                  ),
                  
                  const SizedBox(height: 20),
                  const Divider(color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 20),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text("Don't have an account? ", style: TextStyle(color: Color(0xFF475569), fontSize: 14)),
                      GestureDetector(
                        onTap: () {
                          Navigator.push(context, MaterialPageRoute(builder: (context) => const SignupScreen()));
                        },
                        child: const Text("Create an account", style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w500, fontSize: 14)),
                      ),
                    ],
                  )
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
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF0F172A)), // Sync to w500
      ),
    );
  }

  Widget _buildTextField({required TextEditingController controller, required String hint}) {
    // Stripped icons exactly as dictated by web protocol
    return TextField(
      controller: controller,
      style: const TextStyle(fontSize: 15),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
        filled: true,
        fillColor: const Color(0xFFF8FAFC), // --background
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8), // --radius-md
          borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1), // --border
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2), // Focus ring mapped
        ),
      ),
    );
  }

  Widget _buildPasswordField() {
    return TextField(
      controller: _passwordController,
      obscureText: _obscurePassword,
      style: const TextStyle(fontSize: 15),
      decoration: InputDecoration(
        hintText: "••••••••",
        hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        suffixIcon: Padding(
          padding: const EdgeInsets.only(right: 8.0),
          child: TextButton(
             onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
             style: TextButton.styleFrom(
               minimumSize: Size.zero,
               padding: const EdgeInsets.all(8),
               tapTargetSize: MaterialTapTargetSize.shrinkWrap,
             ),
             child: Text(_obscurePassword ? "👁️" : "👁️‍🗨️", style: const TextStyle(fontSize: 18)),
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
