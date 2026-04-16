import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:google_fonts/google_fonts.dart';
import 'package:mycardhive_mobile/models/rate.dart';
import 'package:mycardhive_mobile/services/rates_service.dart';
import 'package:mycardhive_mobile/ui/widgets/rates_calculator.dart';
import 'package:mycardhive_mobile/ui/screens/login_screen.dart';
import 'package:mycardhive_mobile/ui/screens/signup_screen.dart';
import 'package:mycardhive_mobile/ui/screens/dashboard_screen.dart';
import 'package:provider/provider.dart';
import 'package:mycardhive_mobile/providers/theme_provider.dart';
import 'package:mycardhive_mobile/providers/connectivity_provider.dart';
import 'package:mycardhive_mobile/services/cache_service.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:mycardhive_mobile/services/notification_service.dart';
import 'package:mycardhive_mobile/services/biometric_service.dart';
import 'package:mycardhive_mobile/services/sync_service.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:workmanager/workmanager.dart';

const String kBackgroundNotificationTask = "com.cardhive.notification_job";

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    // 1. Initialize Flutter & Services
    WidgetsFlutterBinding.ensureInitialized();
    await CacheService.init();
    await NotificationService.init();
    
    // 2. Run the check
    final authService = AuthService();
    await NotificationService.checkAndNotify(authService, isBackgroundTask: true);
    
    return Future.value(true);
  });
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Services
  await CacheService.init();
  await NotificationService.init();

  // Initialize Background Workmanager
  await Workmanager().initialize(
    callbackDispatcher,
    isInDebugMode: false,
  );

  // Register Periodic Task
  await Workmanager().registerPeriodicTask(
    "1", 
    kBackgroundNotificationTask,
    frequency: const Duration(minutes: 15), // Flutter minimum
    constraints: Constraints(
      networkType: NetworkType.connected,
    ),
  );
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => ConnectivityProvider()),
      ],
      child: const MyCardHiveApp(),
    ),
  );
}

class MyCardHiveApp extends StatefulWidget {
  const MyCardHiveApp({super.key});

  @override
  State<MyCardHiveApp> createState() => _MyCardHiveAppState();
}

class _MyCardHiveAppState extends State<MyCardHiveApp> {
  final AuthService _authService = AuthService();
  Widget? _startScreen;

  @override
  void initState() {
    super.initState();
    _checkInitialAuth();
    _setupConnectivityListener();
  }

  void _setupConnectivityListener() {
    // Listen for connectivity changes to trigger sync
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<ConnectivityProvider>(context, listen: false).addListener(() {
        final connectivity = Provider.of<ConnectivityProvider>(context, listen: false);
        if (!connectivity.isOffline) {
          SyncService.syncOfflineTrades();
        }
      });
    });
  }

  Future<void> _checkInitialAuth() async {
    final result = await _authService.tryAutoLogin();
    
    if (result['success']) {
      // If biometrics are enabled, we might want to prompt before dashboard
      // But for "Remember Me" logic, we typically go straight in unless it's a cold boot 'App Lock'
      setState(() {
        _startScreen = DashboardScreen(user: result['user']);
      });
    } else {
      setState(() {
        _startScreen = const HomeScreen();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_startScreen == null) {
      return const MaterialApp(home: Scaffold(body: Center(child: CircularProgressIndicator())));
    }

    final themeProvider = Provider.of<ThemeProvider>(context);
    
    return MaterialApp(
      title: 'Card Hive',
      debugShowCheckedModeBanner: false,
      themeMode: themeProvider.themeMode,
      theme: ThemeData(
        brightness: Brightness.light,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        cardColor: Colors.white,
        dividerColor: const Color(0xFFE2E8F0),
        useMaterial3: true,
        textTheme: GoogleFonts.interTextTheme(ThemeData.light().textTheme),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          primary: const Color(0xFF2563EB),
          surface: Colors.white,
          onSurface: const Color(0xFF0F172A),
        ),
      ),
      darkTheme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        cardColor: const Color(0xFF1E293B),
        dividerColor: const Color(0xFF334155),
        useMaterial3: true,
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          primary: const Color(0xFF2563EB),
          surface: const Color(0xFF1E293B),
          onSurface: Colors.white,
          brightness: Brightness.dark,
        ),
      ),
      home: Stack(
        children: [
          _startScreen!,
          const OfflineBanner(),
        ],
      ),
    );
  }
}

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final connectivity = Provider.of<ConnectivityProvider>(context);
    if (!connectivity.isOffline) return const SizedBox.shrink();

    return Positioned(
      top: MediaQuery.of(context).padding.top,
      left: 0,
      right: 0,
      child: Material(
        color: Colors.redAccent,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 4),
          alignment: Alignment.center,
          child: const Text(
            "Offline Mode - Using Cached Data",
            style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
          ),
        ),
      ),
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
  
  final GlobalKey _ratesKey = GlobalKey();
  final GlobalKey _howItWorksKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    _ratesFuture = _ratesService.fetchRates();
  }

  void _scrollTo(GlobalKey key) {
    Navigator.pop(context); // Close drawer
    Scrollable.ensureVisible(
      key.currentContext!,
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeInOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      extendBodyBehindAppBar: true,
      endDrawer: Drawer(
        backgroundColor: theme.cardColor,
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
                        Text(
                          "Instant Cash for All Your Gift Cards",
                          style: TextStyle(
                            color: isDark ? const Color(0xFFC084FC) : const Color(0xFF2E1065),
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      icon: Icon(Icons.close, size: 28, color: theme.colorScheme.onSurface),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              Divider(color: theme.dividerColor, thickness: 1, indent: 20, endIndent: 20),
              const SizedBox(height: 10),
              _buildDrawerItem(context, 'Rates', () => _scrollTo(_ratesKey)),
              _buildDrawerItem(context, 'How It Works', () => _scrollTo(_howItWorksKey)),
              _buildDrawerItem(context, 'FAQ', () => _scrollTo(_howItWorksKey)), // Scopes to How it works for now
              _buildDrawerItem(context, 'Check Balance', () {
                Navigator.pop(context);
                launchUrl(Uri.parse("https://mycardhive.com/check-balance"));
              }),
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
        backgroundColor: isDark ? const Color(0xFF0F172A).withOpacity(0.85) : Colors.white.withOpacity(0.85),
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
            Text(
              'CARD HIVE',
              style: TextStyle(fontWeight: FontWeight.w900, color: theme.colorScheme.onSurface, fontSize: 20, letterSpacing: -0.5),
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
              icon: Icon(Icons.menu, color: theme.colorScheme.onSurface, size: 28),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildHero(theme, isDark),
            Padding(
              key: _ratesKey,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
              child: FutureBuilder<RatesResponse>(
                future: _ratesFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  } else if (snapshot.hasError) {
                    return Center(child: Text("Error loading rates: ${snapshot.error}", style: TextStyle(color: theme.colorScheme.onSurface)));
                  } else if (!snapshot.hasData) {
                    return Center(child: Text("No data available", style: TextStyle(color: theme.colorScheme.onSurface)));
                  }

                  return RatesCalculator(
                    rates: snapshot.data!.rates,
                    usdtExchangeRate: snapshot.data!.usdtExchangeRate,
                  );
                },
              ),
            ),
            Padding(
              key: _howItWorksKey,
              padding: EdgeInsets.zero,
              child: _buildHowItWorks(theme),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHero(ThemeData theme, bool isDark) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.only(left: 24, right: 24, top: 120, bottom: 40),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: isDark 
            ? [const Color(0xFF1E1B4B), theme.scaffoldBackgroundColor] 
            : [const Color(0xFFDBEAFE), Colors.white],
          stops: const [0.0, 1.0],
        ),
        border: Border(bottom: BorderSide(color: theme.dividerColor)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: isDark ? Colors.green.withOpacity(0.1) : Colors.green[50],
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Text(
              "Trusted by 5,000+ traders",
              style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            "Trade your Gift Cards for Instant Cash.",
            style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, height: 1.15, color: theme.colorScheme.onSurface, letterSpacing: -1.0),
          ),
          const SizedBox(height: 12),
          Text(
            "Sell your gift cards for instant payouts via MTN & Telecel. No complicated processes.",
            style: TextStyle(fontSize: 16, color: isDark ? Colors.white54 : Colors.black54),
          ),
        ],
      ),
    );
  }

  Widget _buildHowItWorks(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "How it works",
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface),
          ),
          const SizedBox(height: 15),
          _buildStepCard(1, "Sign up & Log in", "Create a free account to securely track your trades.", theme),
          _buildStepCard(2, "Submit Details", "Provide card details and mobile money number.", theme),
          _buildStepCard(3, "Get Paid", "Direct payouts to your MTN or Telecel wallet.", theme),
        ],
      ),
    );
  }

  Widget _buildStepCard(int step, String title, String desc, ThemeData theme) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: theme.cardColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: theme.dividerColor),
      ),
      elevation: 0,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: const Color(0xFF2563EB),
          child: Text(step.toString(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ),
        title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
        subtitle: Text(desc, style: TextStyle(color: theme.brightness == Brightness.dark ? Colors.white54 : Colors.black54)),
      ),
    );
  }
  Widget _buildDrawerItem(BuildContext context, String title, VoidCallback onTap) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Text(
          title,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white70 : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }
}
