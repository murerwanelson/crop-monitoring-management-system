import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../widgets/wave_clipper.dart';
import '../widgets/app_drawer.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();

    return Scaffold(
      backgroundColor: Colors.white,
      drawer: const AppDrawer(),
      body: Stack(
        children: [
          // 1. Content (Bottom layer) - It will scroll behind the image
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  // This spacer ensures cards start below the header image
                  SizedBox(height: MediaQuery.of(context).size.height * 0.32),
                  
                  // Welcome Text
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome back,',
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.grey.shade600,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          appState.user?['username'] ?? 'User',
                          style: const TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1B5E20),
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8F5E9),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFF1B5E20).withOpacity(0.2)),
                          ),
                          child: Text(
                            (appState.userRole ?? 'Unknown Role').toUpperCase(),
                            style: const TextStyle(
                              color: Color(0xFF2E7D32),
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 48),

                  _DashboardCard(
                    icon: Icons.add_circle_outline_rounded,
                    title: 'New Observation',
                    subtitle: 'Quickly capture field data',
                    onTap: () => Navigator.pushNamed(context, '/add-observation'),
                  ),

                  _DashboardCard(
                    icon: Icons.auto_graph_rounded,
                    title: 'View History',
                    subtitle: 'Analyze your monitoring data',
                    onTap: () => Navigator.pushNamed(context, '/home'),
                  ),

                  _DashboardCard(
                    icon: Icons.analytics_rounded,
                    title: 'Growth Analytics',
                    subtitle: 'Real-time crop health trends',
                    onTap: () => Navigator.pushNamed(context, '/analytics'),
                  ),

                  _DashboardCard(
                    icon: Icons.map_rounded,
                    title: 'Field Map Hub',
                    subtitle: 'Digital boundaries & tracking',
                    onTap: () => Navigator.pushNamed(context, '/map-hub'),
                  ),

                  _DashboardCard(
                    icon: Icons.info_outline_rounded,
                    title: 'System Info',
                    subtitle: 'About the monitoring system',
                    onTap: () => Navigator.pushNamed(context, '/about'),
                  ),

                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),

          // 2. Background with Wave (Middle layer - Fixed on top)
          IgnorePointer(
            child: ClipPath(
              clipper: WaveClipper(),
              child: Container(
                height: MediaQuery.of(context).size.height * 0.42,
                decoration: const BoxDecoration(
                  image: DecorationImage(
                    image: AssetImage('assets/images/tropical_leaves.png'),
                    fit: BoxFit.cover,
                  ),
                ),
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black.withOpacity(0.3),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          
          // 3. Custom Top Bar (Top layer)
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Builder(
                builder: (context) => Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _HeaderAction(
                      icon: Icons.menu_rounded,
                      onTap: () {
                        Scaffold.of(context).openDrawer();
                      },
                    ),
                    Row(
                      children: [
                        if (appState.isSyncing)
                          const Padding(
                            padding: EdgeInsets.only(right: 12),
                            child: SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        _HeaderAction(
                          icon: Icons.refresh_rounded,
                          onTap: () async {
                            if (!appState.isOnline) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Working offline. Please check your connection to sync.')),
                              );
                              return;
                            }
                            await appState.startSync();
                            if (appState.unsyncedCount == 0) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Data is up to date! ✅')),
                              );
                            }
                          },
                        ),
                        const SizedBox(width: 12),
                        _HeaderAction(
                          icon: Icons.logout_rounded,
                          onTap: () async {
                            await appState.logout();
                            Navigator.pushReplacementNamed(context, '/login');
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeaderAction extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _HeaderAction({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 1.5),
        ),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
    );
  }
}

class _DashboardCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final Color? iconColor;

  const _DashboardCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFE8F5E9), width: 2),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF1B5E20).withOpacity(0.04),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: (iconColor ?? const Color(0xFF2E7D32)).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: iconColor ?? const Color(0xFF2E7D32), size: 28),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1B5E20),
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade500,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: Colors.grey.shade300),
            ],
          ),
        ),
      ),
    );
  }
}
