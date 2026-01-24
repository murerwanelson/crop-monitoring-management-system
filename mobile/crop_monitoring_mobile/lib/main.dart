import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'screens/welcome_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/observations_list_screen.dart';
import 'screens/observation_form_screen.dart';
import 'screens/observation_detail_screen.dart';
import 'screens/field_form_screen.dart';
import 'screens/about_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/analytics_screen.dart';
import 'screens/field_map_hub_screen.dart';
import 'providers/app_state.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (context) => AppState(),
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
        '/add-observation': (context) => const ObservationFormScreen(),
        '/add-field': (context) => const FieldFormScreen(),
        '/about': (context) => const AboutScreen(),
        '/forgot-password': (context) => const ForgotPasswordScreen(),
        '/analytics': (context) => const AnalyticsScreen(),
        '/map-hub': (context) => const FieldMapHubScreen(),
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

