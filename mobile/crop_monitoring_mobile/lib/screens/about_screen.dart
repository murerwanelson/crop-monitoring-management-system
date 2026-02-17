import 'package:flutter/material.dart';
import '../widgets/wave_clipper.dart';
import '../widgets/app_drawer.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      drawer: const AppDrawer(),
      body: Stack(
        children: [
          // Layer 1: Scrollable Content (Bottom layer)
          SingleChildScrollView(
            padding: const EdgeInsets.only(top: 280),
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSectionHeader('Our Mission'),
                  const SizedBox(height: 12),
                  const Text(
                    'Empowering farmers with real-time data and sustainable insights to optimize crop yields and reduce environmental impact.',
                    style: TextStyle(fontSize: 16, height: 1.5, color: Colors.black87),
                  ),
                  const SizedBox(height: 32),
                  _buildSectionHeader('Key Features'),
                  const SizedBox(height: 16),
                  _buildFeatureItem(Icons.cloud_sync_rounded, 'Cloud Sync', 'Automatic background data synchronization.'),
                  _buildFeatureItem(Icons.wifi_off_rounded, 'Offline First', 'Full functionality even without an internet connection.'),
                  _buildFeatureItem(Icons.security_rounded, 'Secure Data', 'Enterprise-grade security for your farm information.'),
                  _buildFeatureItem(Icons.analytics_rounded, 'Deep Insights', 'Advanced analytics for better decision making.'),
                  const SizedBox(height: 32),
                  _buildSectionHeader('Version Information'),
                  const SizedBox(height: 12),
                  const Center(
                    child: Column(
                      children: [
                        Icon(Icons.eco, color: Color(0xFF2E7D32), size: 48),
                        SizedBox(height: 8),
                        Text(
                          'Smart Solutions v2.4.0',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                        ),
                        Text(
                          'Build 2026.02.01',
                          style: TextStyle(color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 48),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F5E9),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      children: [
                        const Text(
                          'Need Support?',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1B5E20)),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'We\'re here to help you grow.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Color(0xFF2E7D32)),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {},
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2E7D32),
                            foregroundColor: Colors.white,
                            minimumSize: const Size(200, 48),
                          ),
                          child: const Text('Contact Us'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),

          // Layer 2: Fixed Premium Header (Top layer)
          IgnorePointer(
            child: SizedBox(
              height: 280,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ClipPath(
                    clipper: WaveClipper(),
                    child: Container(
                      decoration: const BoxDecoration(
                        image: DecorationImage(
                          image: AssetImage('assets/images/about_hero.png'),
                          fit: BoxFit.cover,
                        ),
                      ),
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withValues(alpha: 0.4),
                              const Color(0xFF1B5E20).withValues(alpha: 0.2),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 40,
                    left: 24,
                    child: const Text(
                      'About',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        shadows: [Shadow(color: Colors.black45, blurRadius: 10)],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Custom Back Button & Menu Button since we are no longer using AppBar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const Spacer(),
                  Builder(
                    builder: (context) => IconButton(
                      icon: const Icon(Icons.menu_rounded, color: Colors.white, size: 28),
                      onPressed: () => Scaffold.of(context).openDrawer(),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title.toUpperCase(),
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.bold,
        letterSpacing: 1.5,
        color: Color(0xFF2E7D32),
      ),
    );
  }

  Widget _buildFeatureItem(IconData icon, String title, String description) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE8F5E9), width: 2),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1B5E20).withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFE8F5E9),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: const Color(0xFF2E7D32), size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16, 
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1B5E20),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
