import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/sync_provider.dart';
import '../providers/ui_provider.dart';
import '../screens/observation_form_screen.dart';
import 'wave_clipper.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final syncProvider = context.watch<SyncProvider>();
    final uiProvider = context.watch<UIProvider>();
    // final theme = Theme.of(context); // Removed unused variable
    final size = MediaQuery.of(context).size;

    return Drawer(
      width: size.width * 0.85,
      backgroundColor: Colors.white,
      child: Stack(
        children: [
          // Layer 1: Navigation List (Bottom layer)
          Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 290, 16, 20),
                  children: [
                    _buildModernTile(
                      context,
                      icon: Icons.dashboard_rounded,
                      title: 'Dashboard',
                      isActive: ModalRoute.of(context)?.settings.name == '/dashboard',
                      onTap: () {
                        Navigator.pop(context);
                        if (ModalRoute.of(context)?.settings.name != '/dashboard') {
                          Navigator.pushReplacementNamed(context, '/dashboard');
                        }
                      },
                    ),
                    _buildModernTile(
                      context,
                      icon: Icons.list_alt_rounded,
                      title: 'Observations',
                      isActive: ModalRoute.of(context)?.settings.name == '/home',
                      onTap: () {
                        Navigator.pop(context);
                        if (ModalRoute.of(context)?.settings.name != '/home') {
                          Navigator.pushReplacementNamed(context, '/home');
                        }
                      },
                    ),
                    _buildModernTile(
                      context,
                      icon: Icons.add_circle_outline_rounded,
                      title: 'New Observation',
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(context,
                          MaterialPageRoute(builder: (_) => const ObservationFormScreen()));
                      },
                    ),
                    _buildModernTile(
                      context,
                      icon: Icons.info_outline_rounded,
                      title: 'About',
                      isActive: ModalRoute.of(context)?.settings.name == '/about',
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.pushNamed(context, '/about');
                      },
                    ),
                    
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 20),
                      child: Divider(color: Color(0xFFE8F5E9), thickness: 2),
                    ),

                    _buildModernTile(
                      context,
                      icon: Icons.delete_sweep_rounded,
                      title: 'Clear Local Data',
                      iconColor: Colors.orange.shade700,
                      onTap: () async {
                        final confirm = await showDialog<bool>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                            title: const Text('Clear Local Data?'),
                            content: const Text('This will delete unsynced records. This action cannot be undone.'),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                              ElevatedButton(
                                onPressed: () => Navigator.pop(ctx, true),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.red.shade50,
                                  foregroundColor: Colors.red,
                                  elevation: 0,
                                ),
                                child: const Text('Clear'),
                              ),
                            ],
                          ),
                        );
                        if (confirm == true) {
                          await syncProvider.clearLocalData();
                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Local data cleared successfully')));
                          }
                        }
                      },
                    ),
                  ],
                ),
              ),
              // Footer Logout
              Padding(
                padding: const EdgeInsets.all(24.0),
                child: InkWell(
                  onTap: () async {
                    await authProvider.logout();
                    if (context.mounted) {
                      Navigator.pop(context);
                      Navigator.pushReplacementNamed(context, '/login');
                    }
                  },
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.logout_rounded, color: Colors.red.shade700, size: 20),
                        const SizedBox(width: 12),
                        Text(
                          'Logout',
                          style: TextStyle(
                            color: Colors.red.shade700,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),

          // Layer 2: Premium Header (Top layer)
          IgnorePointer(
            child: SizedBox(
              height: 280,
              child: Stack(
                children: [
                  // Background Image with Wave effect
                  Positioned.fill(
                    child: ClipPath(
                      clipper: WaveClipper(),
                      child: Container(
                        decoration: const BoxDecoration(
                          image: DecorationImage(
                            image: AssetImage('assets/images/sugarcane_modern.png'),
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
                  ),
                  // User Profile Card (Glassmorphism)
                  Positioned(
                    bottom: 24,
                    left: 20,
                    right: 20,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.35),
                              width: 1.5,
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.9),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.person_rounded, 
                                    color: Color(0xFF1B5E20), size: 28),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      authProvider.user?['username'] ?? 'Guest User',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: -0.5,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Text(
                                      (authProvider.userRole ?? 'Observer').toUpperCase(),
                                      style: TextStyle(
                                        backgroundColor: Colors.white.withValues(alpha: 0.1),
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        letterSpacing: 1.2,
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
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModernTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    bool isActive = false,
    Color? iconColor,
  }) {
    final activeColor = const Color(0xFF2E7D32);
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: isActive ? activeColor.withValues(alpha: 0.08) : Colors.transparent,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isActive ? activeColor.withValues(alpha: 0.2) : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                color: isActive ? activeColor : (iconColor ?? Colors.grey.shade600),
                size: 24,
              ),
              const SizedBox(width: 16),
              Text(
                title,
                style: TextStyle(
                  color: isActive ? activeColor : Colors.grey.shade800,
                  fontSize: 16,
                  fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                ),
              ),
              if (isActive) ...[
                const Spacer(),
                Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    color: Color(0xFF2E7D32),
                    shape: BoxShape.circle,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
