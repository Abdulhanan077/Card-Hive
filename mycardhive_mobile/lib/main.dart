import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:google_fonts/google_fonts.dart';
import 'package:mycardhive_mobile/models/rate.dart';
import 'package:mycardhive_mobile/services/rates_service.dart';
import 'package:mycardhive_mobile/ui/widgets/rates_calculator.dart';
import 'package:mycardhive_mobile/ui/screens/login_screen.dart';
import 'package:mycardhive_mobile/ui/screens/signup_screen.dart';

void main() {
  runApp(const MyCardHiveApp());
}

class MyCardHiveApp extends StatelessWidget {
  const MyCardHiveApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Card Hive',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          primary: const Color(0xFF2563EB),
          surface: Colors.white,
        ),
        useMaterial3: true,
        textTheme: GoogleFonts.interTextTheme(),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      ),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final RatesService _ratesService = RatesService();
  late Future<RatesResponse> _ratesFuture;

  @override
  void initState() {
    super.initState();
    _ratesFuture = _ratesService.fetchRates();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      endDrawer: Drawer(
        backgroundColor: Colors.white,
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Image.asset('assets/logo.png', height: 48),
                        const SizedBox(height: 12),
                        const Text(
                          "Instant Cash for All Your Gift Cards",
                          style: TextStyle(
                            color: Color(0xFF2E1065),
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      icon: const Icon(Icons.close, size: 28, color: Color(0xFF0F172A)),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const Divider(color: Color(0xFFE2E8F0), thickness: 1, indent: 20, endIndent: 20),
              const SizedBox(height: 10),
              _buildDrawerItem(context, 'Rates', () => Navigator.pop(context)),
              _buildDrawerItem(context, 'How It Works', () => Navigator.pop(context)),
              _buildDrawerItem(context, 'FAQ', () => Navigator.pop(context)),
              _buildDrawerItem(context, 'Check Balance', () => Navigator.pop(context)),
              _buildDrawerItem(context, 'Login', () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (context) => const LoginScreen()));
              }),
              const Spacer(),
              Padding(
                padding: const EdgeInsets.all(20),
                child: SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (context) => const SignupScreen()));
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      elevation: 0,
                    ),
                    child: const Text("Sign Up", style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 16)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      appBar: AppBar(
        backgroundColor: Colors.white.withOpacity(0.85),
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        flexibleSpace: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 15.0, sigmaY: 15.0),
            child: Container(color: Colors.transparent),
          ),
        ),
        title: Row(
          children: [
            Image.asset('assets/logo.png', height: 32),
            const SizedBox(width: 8),
            const Text(
              'CARD HIVE',
              style: TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF0F172A), fontSize: 20, letterSpacing: -0.5),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (context) => const LoginScreen()));
            },
            icon: const Icon(Icons.account_circle, color: Color(0xFF2563EB), size: 28),
          ),
          Builder(
            builder: (context) => IconButton(
              onPressed: () {
                Scaffold.of(context).openEndDrawer();
              },
              icon: const Icon(Icons.menu, color: Color(0xFF0F172A), size: 28),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildHero(),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
              child: FutureBuilder<RatesResponse>(
                future: _ratesFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  } else if (snapshot.hasError) {
                    return Center(child: Text("Error loading rates: ${snapshot.error}"));
                  } else if (!snapshot.hasData) {
                    return const Center(child: Text("No data available"));
                  }

                  return RatesCalculator(
                    rates: snapshot.data!.rates,
                    usdtExchangeRate: snapshot.data!.usdtExchangeRate,
                  );
                },
              ),
            ),
            _buildHowItWorks(),
          ],
        ),
      ),
    );
  }

  Widget _buildHero() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.only(left: 24, right: 24, top: 120, bottom: 40),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFDBEAFE), Colors.white], // Soft light blue to white
          stops: [0.0, 1.0],
        ),
        border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.green[50],
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Text(
              "Trusted by 5,000+ traders",
              style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            "Trade your Gift Cards for Instant Cash.",
            style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, height: 1.15, color: Color(0xFF0F172A), letterSpacing: -1.0),
          ),
          const SizedBox(height: 12),
          const Text(
            "Sell your gift cards for instant payouts via MTN & Telecel. No complicated processes.",
            style: TextStyle(fontSize: 16, color: Colors.black54),
          ),
        ],
      ),
    );
  }

  Widget _buildHowItWorks() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "How it works",
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 15),
          _buildStepCard(1, "Sign up & Log in", "Create a free account to securely track your trades."),
          _buildStepCard(2, "Submit Details", "Provide card details and mobile money number."),
          _buildStepCard(3, "Get Paid", "Direct payouts to your MTN or Telecel wallet."),
        ],
      ),
    );
  }

  Widget _buildStepCard(int step, String title, String desc) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      elevation: 0,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: const Color(0xFF2563EB),
          child: Text(step.toString(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(desc),
      ),
    );
  }
  Widget _buildDrawerItem(BuildContext context, String title, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Color(0xFF475569),
          ),
        ),
      ),
    );
  }
}
