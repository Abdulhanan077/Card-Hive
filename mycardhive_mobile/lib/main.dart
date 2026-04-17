import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:google_fonts/google_fonts.dart';
import 'package:mycardhive_mobile/models/rate.dart';
import 'package:mycardhive_mobile/services/rates_service.dart';
import 'package:mycardhive_mobile/ui/widgets/rates_calculator.dart';
import 'package:mycardhive_mobile/ui/screens/login_screen.dart';
import 'package:mycardhive_mobile/ui/screens/signup_screen.dart';
import 'package:mycardhive_mobile/ui/screens/dashboard_screen.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_home.dart';
import 'package:mycardhive_mobile/ui/screens/home_screen.dart';
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
import 'package:firebase_core/firebase_core.dart';
import 'package:mycardhive_mobile/firebase_options.dart';

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
  try {
    WidgetsFlutterBinding.ensureInitialized();
  } catch (e) {
    debugPrint("Binding Error: $e");
  }
  
  // 1. Initialize Firebase (Safe check)
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (e) {
    debugPrint("Firebase Init Error: $e");
  }

  // 2. Initialize Services (Individual Catching)
  try {
    await CacheService.init();
  } catch (e) {
    debugPrint("Cache Init Error: $e");
  }
  
  try {
    await NotificationService.init();
  } catch (e) {
    debugPrint("Notification Init Error: $e");
  }

  // 3. Initialize Background Workmanager
  try {
    await Workmanager().initialize(
      callbackDispatcher,
      isInDebugMode: false,
    );
    
    await Workmanager().registerPeriodicTask(
      "com.cardhive.notification_job_unique", 
      kBackgroundNotificationTask,
      frequency: const Duration(minutes: 15),
      existingWorkPolicy: ExistingPeriodicWorkPolicy.keep,
      constraints: Constraints(
        networkType: NetworkType.connected,
      ),
    );
  } catch (e) {
    debugPrint("Workmanager Error: $e");
  }
  
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
        if (result['user']['role'] == 'ADMIN') {
          _startScreen = AdminHome(user: result['user']);
        } else {
          _startScreen = DashboardScreen(user: result['user']);
        }
      });
      // Sync FCM Token
      NotificationService.syncFcmToken(_authService);
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
