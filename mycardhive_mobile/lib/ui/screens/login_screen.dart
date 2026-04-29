import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:mycardhive_mobile/ui/screens/signup_screen.dart';
import 'package:mycardhive_mobile/ui/screens/dashboard_screen.dart';
import 'package:mycardhive_mobile/ui/screens/home_screen.dart';
import 'package:mycardhive_mobile/ui/screens/forgot_password_screen.dart';
import 'package:mycardhive_mobile/services/biometric_service.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_home.dart';

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
  bool _rememberMe = false;
  bool _canCheckBiometrics = false;
  bool _biometricsEnabled = false;
  bool _promptShown = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkBiometrics().catchError((e) => debugPrint("Biometric Check Error: $e"));
      _loadSavedCredentials().catchError((e) => debugPrint("Load Credentials Error: $e"));
    });
  }

  Future<void> _checkBiometrics() async {
    final canCheck = await BiometricService.canCheckBiometrics();
    final enabled = await _authService.isBiometricsEnabled();
    final promptShown = await _authService.wasBiometricPromptShown();
    setState(() {
      _canCheckBiometrics = canCheck;
      _biometricsEnabled = enabled;
      _promptShown = promptShown;
    });

    if (enabled && canCheck) {
      _handleBiometricLogin();
    }
  }

  Future<void> _loadSavedCredentials() async {
    final creds = await _authService.getSavedCredentials();
    if (creds['username'] != null) {
      setState(() {
        _emailController.text = creds['username']!;
        _passwordController.text = creds['password']!;
        _rememberMe = true;
      });
    }
  }

  Future<void> _handleBiometricLogin() async {
    final enrolled = await BiometricService.isBiometricEnrolled();
    if (!enrolled) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No biometrics enrolled. Please log in manually.'), backgroundColor: Colors.orange),
      );
      return;
    }

    final authenticated = await BiometricService.authenticate();
    if (authenticated) {
      final creds = await _authService.getSavedCredentials();
      if (creds['username'] != null && creds['password'] != null) {
        _emailController.text = creds['username']!;
        _passwordController.text = creds['password']!;
        _handleLogin();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please log in manually first to enable Biometrics')),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Biometric authentication failed.'), backgroundColor: Colors.redAccent),
      );
    }
  }

  Future<void> _handleLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enter email and password'), backgroundColor: Colors.red),
        );
      }
      return;
    }

    setState(() => _isLoading = true);

    final result = await _authService.login(email, password, rememberMe: _rememberMe);

    setState(() => _isLoading = false);

    if (!mounted) return;

    if (result['success']) {
      if (_canCheckBiometrics && !_biometricsEnabled && !_promptShown) {
        _showBiometricPrompt(result['user']);
      } else {
        _navigateToDashboard(result['user']);
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['error'] ?? 'Login failed'), backgroundColor: Colors.red),
      );
    }
  }

  void _showBiometricPrompt(dynamic user) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Enable Biometrics?"),
        content: const Text("Would you like to enable Fingerprint/FaceID for faster access next time?"),
        actions: [
          TextButton(onPressed: () async {
            await _authService.setBiometricPromptShown(true);
            _navigateToDashboard(user);
          }, child: const Text("Later")),
          ElevatedButton(
            onPressed: () async {
              await _authService.setBiometricsEnabled(true);
              await _authService.setBiometricPromptShown(true);
              Navigator.pop(context);
              _navigateToDashboard(user);
            },
            child: const Text("Enable"),
          ),
        ],
      ),
    );
  }

  void _navigateToDashboard(dynamic user) {
    if (user['role'] == 'ADMIN') {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => AdminHome(user: user)),
        (route) => false,
      );
    } else {
      Navigator.pushAndRemoveUntil(
        context, 
        MaterialPageRoute(builder: (context) => DashboardScreen(user: user)), 
        (route) => false,
      );
    }
  }

  Future<void> _launchURL(String url) async {
    final Uri uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not launch $url')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: theme.colorScheme.onSurface),
          onPressed: () {
            if (Navigator.canPop(context)) {
              Navigator.pop(context);
            } else {
              Navigator.pushAndRemoveUntil(
                context, 
                MaterialPageRoute(builder: (context) => const HomeScreen()), 
                (route) => false
              );
            }
          },
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Image.asset('assets/logo.png', height: 120),
                const SizedBox(height: 10),
                Container(
                  // The exact "authCard" CSS recreation
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: theme.cardColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: theme.dividerColor),
                boxShadow: isDark ? [] : const [
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
                        color: isDark ? theme.scaffoldBackgroundColor : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Icon(
                          Icons.lock_outline_rounded, 
                          size: 28, 
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    "Welcome Back",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Sign in to MyCardHive to track your trades",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 15, color: isDark ? Colors.white54 : const Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 32),
                  
                  _buildLabel("Username or Email", theme, isDark),
                  _buildTextField(
                    controller: _emailController,
                    hint: "Enter username or email",
                    theme: theme, isDark: isDark,
                  ),
                  
                  const SizedBox(height: 20),
                  
                  _buildLabel("Password", theme, isDark),
                  _buildPasswordField(theme, isDark),
                  
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          SizedBox(
                            width: 24,
                            height: 24,
                            child: Checkbox(
                              value: _rememberMe,
                              onChanged: (val) => setState(() => _rememberMe = val ?? false),
                              activeColor: const Color(0xFF2563EB),
                            ),
                          ),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: () => setState(() => _rememberMe = !_rememberMe),
                            child: Text("Remember Me", style: TextStyle(color: theme.colorScheme.onSurface, fontSize: 13)),
                          ),
                        ],
                      ),
                      TextButton(
                        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const ForgotPasswordScreen())),
                        style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(50, 30), tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                        child: const Text("Forgot Password?", style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w500, fontSize: 13)),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 24),
                  
                  SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _handleLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        elevation: 0,
                      ),
                      child: _isLoading
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text("Sign In", style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white)),
                    ),
                  ),

                  if (_canCheckBiometrics && _biometricsEnabled) ...[
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      onPressed: _handleBiometricLogin,
                      icon: const Icon(Icons.fingerprint),
                      label: const Text("Use Biometrics"),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(double.infinity, 48),
                        side: BorderSide(color: theme.dividerColor),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                  
                  const SizedBox(height: 20),
                  const Divider(color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 20),

                  Wrap(
                    alignment: WrapAlignment.center,
                    children: [
                      const Text("Don't have an account? ", style: TextStyle(color: Color(0xFF475569), fontSize: 14)),
                      GestureDetector(
                        onTap: () {
                          Navigator.push(context, MaterialPageRoute(builder: (context) => const SignupScreen()));
                        },
                        child: const Text("Create an account", style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w500, fontSize: 14)),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    child: RichText(
                      textAlign: TextAlign.center,
                      text: TextSpan(
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.white54 : const Color(0xFF64748B),
                          height: 1.5,
                        ),
                        children: [
                          const TextSpan(text: "By continuing, you agree to MyCardHive "),
                          TextSpan(
                            text: "Terms of Use",
                            style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold),
                            recognizer: TapGestureRecognizer()..onTap = () => _launchURL("https://mycardhive.com/terms-of-service"),
                          ),
                          const TextSpan(text: " and confirm that you have read our "),
                          TextSpan(
                            text: "Privacy Policy",
                            style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold),
                            recognizer: TapGestureRecognizer()..onTap = () => _launchURL("https://mycardhive.com/privacy-policy"),
                          ),
                          const TextSpan(text: "."),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  ),
);
  }

  Widget _buildLabel(String text, ThemeData theme, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(
        text,
        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: theme.colorScheme.onSurface), // Sync to w500
      ),
    );
  }

  Widget _buildTextField({required TextEditingController controller, required String hint, required ThemeData theme, required bool isDark}) {
    // Stripped icons exactly as dictated by web protocol
    return TextField(
      controller: controller,
      style: TextStyle(color: theme.colorScheme.onSurface, fontSize: 15),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: isDark ? Colors.white24 : const Color(0xFF94A3B8)),
        filled: true,
        fillColor: isDark ? theme.scaffoldBackgroundColor : const Color(0xFFF8FAFC), // --background
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8), // --radius-md
          borderSide: BorderSide(color: theme.dividerColor, width: 1), // --border
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: theme.dividerColor, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2), // Focus ring mapped
        ),
      ),
    );
  }

  Widget _buildPasswordField(ThemeData theme, bool isDark) {
    return TextField(
      controller: _passwordController,
      obscureText: _obscurePassword,
      style: TextStyle(color: theme.colorScheme.onSurface, fontSize: 15),
      decoration: InputDecoration(
        hintText: "••••••••",
        hintStyle: TextStyle(color: isDark ? Colors.white24 : const Color(0xFF94A3B8)),
        filled: true,
        fillColor: isDark ? theme.scaffoldBackgroundColor : const Color(0xFFF8FAFC),
        suffixIcon: Padding(
          padding: const EdgeInsets.only(right: 8.0),
          child: TextButton(
             onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
             style: TextButton.styleFrom(
               minimumSize: Size.zero,
               padding: const EdgeInsets.all(8),
               tapTargetSize: MaterialTapTargetSize.shrinkWrap,
             ),
             child: Icon(
               _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
               size: 20,
               color: isDark ? Colors.white70 : const Color(0xFF64748B),
             ),
          ),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: theme.dividerColor, width: 1)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: theme.dividerColor, width: 1)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2)),
      ),
    );
  }
}

