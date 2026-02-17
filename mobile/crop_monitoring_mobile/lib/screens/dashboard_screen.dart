import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
// import 'dart:ui'; // Removed unnecessary import
import '../l10n/app_localizations.dart';
import '../providers/auth_provider.dart';
import '../providers/sync_provider.dart';
import '../providers/weather_provider.dart';
import '../providers/location_provider.dart';
import '../providers/ui_provider.dart';
import '../widgets/wave_clipper.dart';
import '../widgets/app_drawer.dart';
import '../widgets/shimmer_loading.dart';
import 'package:lottie/lottie.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    _initialFetch();
  }

  Future<void> _initialFetch() async {
    // We use WidgetsBinding to ensure the context is available
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final locationProvider = context.read<LocationProvider>();
      final weatherProvider = context.read<WeatherProvider>();
      final syncProvider = context.read<SyncProvider>();

      // Start GPS tracking with lower accuracy for weather (faster lock)
      locationProvider.startGpsTracking(accuracy: LocationAccuracy.medium);
      
      // Initial weather fetch
      weatherProvider.refreshWeather(
        locationProvider.currentPosition, 
        syncProvider.isOnline
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final syncProvider = context.watch<SyncProvider>();
    final weatherProvider = context.watch<WeatherProvider>();
    final uiProvider = context.watch<UIProvider>();
    final locationProvider = context.read<LocationProvider>();
    
    final bool isFieldMode = uiProvider.isFieldMode;
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: isFieldMode ? Colors.white : const Color(0xFFF5F9F6),
      drawer: const AppDrawer(),
      body: Stack(
        children: [
          // 1. Background with Wave
          if (!isFieldMode)
            IgnorePointer(
              child: ClipPath(
                clipper: WaveClipper(),
                child: Container(
                  height: MediaQuery.of(context).size.height * 0.40,
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
                          Colors.black.withValues(alpha: 0.4),
                          const Color(0xFF1B5E20).withValues(alpha: 0.2),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),

          // 2. Scrollable Content
          SafeArea(
            child: RefreshIndicator(
              onRefresh: () async {
                final pos = locationProvider.currentPosition;
                await Future.wait([
                  syncProvider.startSync(),
                  syncProvider.checkUnsynced(),
                  weatherProvider.refreshWeather(pos, syncProvider.isOnline),
                ]);
              },
              color: const Color(0xFF2E7D32),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 12),
                    _buildTopActionRow(context, authProvider, syncProvider, uiProvider),
                    
                    const SizedBox(height: 32),
                    
                    // Welcome & Role
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.welcomeBack,
                          style: TextStyle(
                            fontSize: 16,
                            color: isFieldMode ? Colors.black54 : Colors.white.withValues(alpha: 0.9),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          authProvider.user?['username'] ?? 'User',
                          style: TextStyle(
                            fontSize: 36,
                            fontWeight: FontWeight.bold,
                            color: isFieldMode ? Colors.black : Colors.white,
                            letterSpacing: -1,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: isFieldMode ? Colors.black12 : Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: isFieldMode ? Colors.black26 : Colors.white.withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            (authProvider.userRole ?? 'Observer').toUpperCase(),
                            style: TextStyle(
                              color: isFieldMode ? Colors.black87 : Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 48),

                    // INTELLIGENCE ROW (Weather & Sync Radar)
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      clipBehavior: Clip.none,
                      child: Row(
                        children: [
                          GestureDetector(
                            onTap: () => Navigator.pushNamed(context, '/weather-detail'),
                            child: _WeatherWidget(weatherProvider: weatherProvider, uiProvider: uiProvider),
                          ),
                          const SizedBox(width: 16),
                          _SyncRadarWidget(syncProvider: syncProvider, uiProvider: uiProvider),
                        ],
                      ),
                    ),

                    const SizedBox(height: 40),

                    // MAIN ACTIONS
                    Text(
                      l10n.fieldOperations,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1B5E20),
                        letterSpacing: 1.5,
                      ),
                    ),
                    const SizedBox(height: 20),
                    
                    _DashboardCard(
                      icon: Icons.add_circle_outline_rounded,
                      title: l10n.newObservation,
                      subtitle: l10n.captureRealTimeData,
                      onTap: () => Navigator.pushNamed(context, '/add-observation'),
                      gradient: const [Color(0xFF2E7D32), Color(0xFF1B5E20)],
                    ),

                    _DashboardCard(
                      icon: Icons.history_rounded,
                      title: l10n.observationHistory,
                      subtitle: l10n.viewManageRecords,
                      onTap: () => Navigator.pushNamed(context, '/home'),
                      gradient: const [Color(0xFF558B2F), Color(0xFF33691E)],
                    ),

                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopActionRow(BuildContext context, AuthProvider authProvider, SyncProvider syncProvider, UIProvider uiProvider) {
    final bool isFieldMode = uiProvider.isFieldMode;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _HeaderAction(
          icon: isFieldMode ? Icons.wb_sunny_rounded : Icons.nightlight_round,
          onTap: () => uiProvider.toggleFieldMode(),
          backgroundColor: isFieldMode ? Colors.orange.withValues(alpha: 0.1) : Colors.white.withValues(alpha: 0.15),
          iconColor: isFieldMode ? Colors.orange : Colors.white,
        ),
        
        // Data Health Indicator (The "Radar" pulse)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: isFieldMode ? Colors.black.withValues(alpha: 0.05) : Colors.white.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: isFieldMode ? Colors.black12 : Colors.white.withValues(alpha: 0.35)),
          ),
          child: Row(
            children: [
              _PulseIndicator(active: syncProvider.unsyncedCount > 0),
              const SizedBox(width: 10),
              Text(
                syncProvider.unsyncedCount == 0 ? AppLocalizations.of(context)!.cloudSynced : AppLocalizations.of(context)!.offlinePending,
                style: TextStyle(
                  color: isFieldMode ? Colors.black : Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 11,
                  letterSpacing: 0.8,
                ),
              ),
            ],
          ),
        ),

        _HeaderAction(
          icon: Icons.logout_rounded,
          onTap: () async {
            await authProvider.logout();
            Navigator.pushReplacementNamed(context, '/login');
          },
        ),
      ],
    );
  }
}

/*
class _SyncSuccessOverlay extends StatelessWidget {
...
}
*/ // Removed unused element

class _WeatherWidget extends StatelessWidget {
  final WeatherProvider weatherProvider;
  final UIProvider uiProvider;
  const _WeatherWidget({required this.weatherProvider, required this.uiProvider});

  @override
  Widget build(BuildContext context) {
    if (weatherProvider.isWeatherLoading && weatherProvider.temperature == 0) {
      return ShimmerLoading.card(width: 170, height: 140);
    }
    
    final condition = weatherProvider.weatherCondition;
    final isFieldMode = uiProvider.isFieldMode;
    final l10n = AppLocalizations.of(context)!;
    
    return Container(
      width: 170,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: isFieldMode ? Border.all(color: Colors.black12, width: 1.5) : null,
        boxShadow: isFieldMode ? [] : [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(_getWeatherIcon(condition), color: _getWeatherColor(condition), size: 28),
              Text(
                '${weatherProvider.temperature.toInt()}°C',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1B5E20)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(l10n.weatherReport, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.5)),
          const SizedBox(height: 4),
          Text(condition, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.umbrella_rounded, size: 12, color: Colors.blue),
              const SizedBox(width: 4),
              Text('${weatherProvider.rainfallChance.toInt()}%', style: const TextStyle(fontSize: 11, color: Colors.blue, fontWeight: FontWeight.w600)),
              const SizedBox(width: 8),
              const Icon(Icons.water_drop_rounded, size: 12, color: Colors.cyan),
              const SizedBox(width: 4),
              Text('${weatherProvider.humidity.toInt()}%', style: const TextStyle(fontSize: 11, color: Colors.cyan, fontWeight: FontWeight.w600)),
            ],
          ),
        ],
      ),
    );
  }

  IconData _getWeatherIcon(String condition) {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return Icons.wb_sunny_rounded;
      case 'partly cloudy':
        return Icons.wb_cloudy_rounded;
      case 'overcast':
      case 'cloudy':
        return Icons.cloud_rounded;
      case 'rainy':
      case 'showers':
        return Icons.beach_access_rounded;
      default:
        return Icons.wb_cloudy_rounded;
    }
  }

  Color _getWeatherColor(String condition) {
    switch (condition.toLowerCase()) {
      case 'sunny':
        return Colors.orangeAccent;
      case 'rainy':
        return Colors.blueAccent;
      default:
        return const Color(0xFF2E7D32);
    }
  }
}

class _SyncRadarWidget extends StatelessWidget {
  final SyncProvider syncProvider;
  final UIProvider uiProvider;
  const _SyncRadarWidget({required this.syncProvider, required this.uiProvider});

  @override
  Widget build(BuildContext context) {
    if (syncProvider.isSyncing && syncProvider.totalRecords == 0) {
      return ShimmerLoading.card(width: 170, height: 140);
    }

    final isFieldMode = uiProvider.isFieldMode;
    final l10n = AppLocalizations.of(context)!;
    final double progress = syncProvider.totalRecords == 0 ? 0 : syncProvider.syncedCount / syncProvider.totalRecords;
    
    return Container(
      width: 170,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isFieldMode ? Colors.white : const Color(0xFF1B5E20),
        borderRadius: BorderRadius.circular(24),
        border: isFieldMode ? Border.all(color: Colors.black12, width: 1.5) : null,
        boxShadow: isFieldMode ? [] : [
          BoxShadow(
            color: const Color(0xFF1B5E20).withValues(alpha: 0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(
                syncProvider.isSyncing ? Icons.radar_rounded : Icons.cloud_done_rounded,
                color: isFieldMode ? const Color(0xFF1B5E20) : Colors.white70,
                size: 28,
              ),
              if (syncProvider.isSyncing)
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: isFieldMode ? const Color(0xFF1B5E20) : Colors.white,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            l10n.dataHealth,
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.bold,
              color: isFieldMode ? Colors.grey : Colors.white70,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            syncProvider.isSyncing ? l10n.syncing : l10n.systemHealthy,
            style: TextStyle(
              color: isFieldMode ? Colors.black : Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 8),
          Stack(
            children: [
              Container(
                height: 6,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: isFieldMode ? Colors.black12 : Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              FractionallySizedBox(
                widthFactor: progress,
                child: Container(
                  height: 6,
                  decoration: BoxDecoration(
                    color: isFieldMode ? const Color(0xFF1B5E20) : Colors.white,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '${syncProvider.syncedCount}/${syncProvider.totalRecords} Records Synced',
            style: TextStyle(
              color: isFieldMode ? Colors.black54 : Colors.white70,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

class _PulseIndicator extends StatefulWidget {
  final bool active;
  const _PulseIndicator({required this.active});

  @override
  State<_PulseIndicator> createState() => _PulseIndicatorState();
}

class _PulseIndicatorState extends State<_PulseIndicator> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.active) return const Icon(Icons.check_circle_rounded, color: Colors.greenAccent, size: 12);
    
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: Colors.orange.withValues(alpha: 1 - _controller.value),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.orange, width: 2),
          ),
        );
      },
    );
  }
}

class _HeaderAction extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final Color? backgroundColor;
  final Color? iconColor;

  const _HeaderAction({
    required this.icon,
    required this.onTap,
    this.backgroundColor,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: backgroundColor ?? Colors.white.withValues(alpha: 0.15),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 1.5),
        ),
        child: Icon(icon, color: iconColor ?? Colors.white, size: 24),
      ),
    );
  }
}

class _DashboardCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final List<Color> gradient;

  const _DashboardCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    required this.gradient,
  });

  @override
  Widget build(BuildContext context) {
    final bool isFieldMode = context.watch<UIProvider>().isFieldMode;
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: isFieldMode ? Colors.black87 : const Color(0xFFE8F5E9), width: isFieldMode ? 2.5 : 2),
            boxShadow: isFieldMode ? [] : [
              BoxShadow(
                color: const Color(0xFF1B5E20).withValues(alpha: 0.06),
                blurRadius: 15,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: isFieldMode ? null : LinearGradient(colors: gradient),
                  color: isFieldMode ? Colors.black : null,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(icon, color: Colors.white, size: 32),
              ),
              const SizedBox(width: 24),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: isFieldMode ? Colors.black : const Color(0xFF1B5E20),
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 14,
                        color: isFieldMode ? Colors.black87 : Colors.grey.shade500,
                        fontWeight: isFieldMode ? FontWeight.bold : FontWeight.w400,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: isFieldMode ? Colors.black : const Color(0xFFE0E0E0),
                size: 30,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
