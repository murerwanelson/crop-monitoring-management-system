import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'l10n/app_localizations.dart';
import 'package:provider/provider.dart';
import 'screens/welcome_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/observations_list_screen.dart';
import 'screens/boundary_list_screen.dart';
import 'screens/observation_form_screen.dart';
import 'screens/observation_detail_screen.dart';
// import 'screens/field_form_screen.dart'; // Deleted
import 'screens/about_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/weather_detail_screen.dart';
import 'screens/boundary_map_screen.dart';
import 'providers/auth_provider.dart';
import 'providers/sync_provider.dart';
import 'providers/weather_provider.dart';
import 'providers/location_provider.dart';
import 'providers/ui_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(
    url: 'https://hwjfswtvpemmszcntgnh.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3amZzd3R2cGVtbXN6Y250Z25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjA5ODUsImV4cCI6MjA4NTIzNjk4NX0.YGh2DaECPnQa4QZC67_Vt8qrO7bVcNxiZaoN7_UayGM',
  );

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => SyncProvider()),
        ChangeNotifierProvider(create: (_) => WeatherProvider()),
        ChangeNotifierProvider(create: (_) => LocationProvider()),
        ChangeNotifierProvider(create: (_) => UIProvider()),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Crop Monitoring App',
      debugShowCheckedModeBanner: false,
      localizationsDelegates: [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('en', ''),
      ],
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.green,
        scaffoldBackgroundColor: const Color(0xFFF5F9F5),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF2E7D32),
          foregroundColor: Colors.white,
          elevation: 0,
          centerTitle: true,
        ),
        cardTheme: CardThemeData(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          color: Colors.white,
          surfaceTintColor: Colors.white,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF2E7D32),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 3,
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
          filled: true,
          fillColor: Colors.white,
          prefixIconColor: const Color(0xFF2E7D32),
          contentPadding: const EdgeInsets.all(20),
        ),
      ),
      initialRoute: '/welcome',
      routes: {
        '/welcome': (context) => const WelcomeScreen(),
        '/login': (context) => const LoginScreen(),
        '/register': (context) => const RegisterScreen(),
        '/dashboard': (context) => const DashboardScreen(),
        '/home': (context) => const ObservationsListScreen(),
        '/boundaries': (context) => const BoundaryListScreen(),
        '/add-observation': (context) => const ObservationFormScreen(),
        // '/add-field': (context) => const FieldFormScreen(), // Unified into observation form
        '/about': (context) => const AboutScreen(),
        '/forgot-password': (context) => const ForgotPasswordScreen(),
        '/weather-detail': (context) => const WeatherDetailScreen(),
        '/boundary-map': (context) => const BoundaryMapScreen(),
      },
      onGenerateRoute: (settings) {
        if (settings.name == '/observation-detail') {
          final id = settings.arguments as int;
          return MaterialPageRoute(
            builder: (context) => ObservationDetailScreen(observationId: id),
          );
        }
        return null;
      },
    );
  }
}

