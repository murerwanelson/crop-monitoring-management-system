import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/app_state.dart';

class AboutScreen extends StatefulWidget {
  const AboutScreen({super.key});

  @override
  State<AboutScreen> createState() => _AboutScreenState();
}

class _AboutScreenState extends State<AboutScreen> {
  static const String appName = 'Crop Monitoring App';
  static const String appVersion = '1.1.0';
  static const String supportEmail = 'support@cropmanager.com';

  @override
  void initState() {
    super.initState();
    // Start GPS tracking when entering the screen for real-time "Pulse"
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppState>().startGpsTracking();
    });
  }

  @override
  void dispose() {
    // Stop tracking when leaving to save battery
    context.read<AppState>().stopGpsTracking();
    super.dispose();
  }

  Future<void> _launchEmail() async {
    final uri = Uri(
      scheme: 'mailto',
      path: supportEmail,
      queryParameters: {'subject': 'System Support - $appVersion'},
    );
    if (!await launchUrl(uri)) debugPrint('Failed to launch email');
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('System Info'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () async {
              await appState.checkUnsynced();
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('System diagnostics updated!'),
                    duration: Duration(seconds: 1),
                  ),
                );
              }
            },
            tooltip: 'Refresh Status',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Center(
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.terminal_rounded, size: 48, color: theme.primaryColor),
                  ),
                  const SizedBox(height: 16),
                  Text(appName, style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
                  Text('v$appVersion • Technical Stack', style: theme.textTheme.bodySmall),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // 1. Technical Health Stack (The "Pulse")
            _SectionHeader(title: 'Technical Health (Pulse)', icon: Icons.monitor_heart_rounded),
            _InfoCard(
              title: 'Storage & Connection',
              children: [
                _StatusRow(
                  label: 'Device Storage',
                  value: 'Ready',
                  statusColor: Colors.green,
                ),
                _StatusRow(
                  label: 'Cloud Sync',
                  value: appState.isOnline ? 'Online' : 'Offline',
                  statusColor: appState.isOnline ? Colors.green : Colors.orange,
                ),
                _StatusRow(
                  label: 'GPS Precision',
                  value: appState.gpsAccuracy != null 
                    ? '${appState.gpsAccuracy!.toStringAsFixed(1)} meters'
                    : 'Searching...',
                  statusColor: (appState.gpsAccuracy ?? 100) < 10 ? Colors.green : Colors.orange,
                ),
              ],
            ),

            // 2. Role & Permissions (The "Badge")
            _SectionHeader(title: 'Role & Permissions (Badge)', icon: Icons.verified_user_rounded),
            _InfoCard(
              title: 'Active Identity',
              children: [
                _StatusRow(
                  label: 'Assigned Role',
                  value: appState.userRole ?? 'Collector',
                  isBadge: true,
                ),
                const SizedBox(height: 12),
                const Text('Authorized Actions:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: (appState.permissions.isEmpty 
                    ? ['capture_observations', 'upload_media', 'view_history'] 
                    : appState.permissions).map((p) => _PermissionChip(label: p)).toList(),
                ),
              ],
            ),

            // 3. Spatial Context
            _SectionHeader(title: 'Spatial Context', icon: Icons.public_rounded),
            _InfoCard(
              title: 'Real-time Signal',
              children: [
                _StatusRow(
                  label: 'Latitude',
                  value: appState.currentPosition?.latitude.toStringAsFixed(6) ?? '...',
                ),
                _StatusRow(
                  label: 'Longitude',
                  value: appState.currentPosition?.longitude.toStringAsFixed(6) ?? '...',
                ),
                _StatusRow(
                  label: 'Map Cache',
                  value: appState.mapCacheSizeMB > 0 
                    ? '${appState.mapCacheSizeMB.toStringAsFixed(1)} MB saved'
                    : 'Empty',
                  statusColor: appState.mapCacheSizeMB > 0 ? Colors.green : Colors.grey,
                ),
              ],
            ),

            const SizedBox(height: 24),
            _ContactButton(onTap: _launchEmail),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  const _SectionHeader({required this.title, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12, top: 8),
      child: Row(
        children: [
          Icon(icon, size: 18, color: Colors.grey.shade600),
          const SizedBox(width: 8),
          Text(title.toUpperCase(), 
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey.shade600, letterSpacing: 1)),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _InfoCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      margin: const EdgeInsets.only(bottom: 20),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: children,
        ),
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? statusColor;
  final bool isBadge;

  const _StatusRow({required this.label, required this.value, this.statusColor, this.isBadge = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
          if (isBadge)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.green.shade100,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.green)),
            )
          else
            Row(
              children: [
                if (statusColor != null)
                  Container(width: 8, height: 8, margin: const EdgeInsets.only(right: 8), 
                    decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle)),
                Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              ],
            ),
        ],
      ),
    );
  }
}

class _PermissionChip extends StatelessWidget {
  final String label;
  const _PermissionChip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Text(label.replaceAll('_', ' '), style: TextStyle(fontSize: 11, color: Colors.grey.shade800)),
    );
  }
}

class _ContactButton extends StatelessWidget {
  final VoidCallback onTap;
  const _ContactButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: onTap,
      style: ElevatedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      icon: const Icon(Icons.support_agent),
      label: const Text('Contact Support'),
    );
  }
}
