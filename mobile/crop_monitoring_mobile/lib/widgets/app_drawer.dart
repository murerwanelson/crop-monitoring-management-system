import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../screens/field_form_screen.dart';
import '../screens/observation_form_screen.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final theme = Theme.of(context);

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: BoxDecoration(color: theme.primaryColor),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.eco, color: Colors.white, size: 48),
                const SizedBox(height: 10),
                const Text('Crop Monitoring',
                    style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                Text(
                  appState.isAuthenticated 
                      ? 'Logged in as ${appState.user?['username'] ?? 'collector'}' 
                      : 'Guest',
                  style: const TextStyle(color: Colors.white70),
                ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard_rounded),
            title: const Text('Dashboard'),
            onTap: () {
              Navigator.pop(context);
              if (ModalRoute.of(context)?.settings.name != '/dashboard') {
                Navigator.pushReplacementNamed(context, '/dashboard');
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.list_alt_rounded),
            title: const Text('Observations'),
            onTap: () {
              Navigator.pop(context);
              if (ModalRoute.of(context)?.settings.name != '/home') {
                Navigator.pushReplacementNamed(context, '/home');
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.analytics_outlined),
            title: const Text('Growth Analytics'),
            onTap: () {
              Navigator.pop(context);
              if (ModalRoute.of(context)?.settings.name != '/analytics') {
                Navigator.pushNamed(context, '/analytics');
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.map_rounded),
            title: const Text('Field Map Hub'),
            onTap: () {
              Navigator.pop(context);
              if (ModalRoute.of(context)?.settings.name != '/map-hub') {
                Navigator.pushNamed(context, '/map-hub');
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.add_circle_outline_rounded),
            title: const Text('New Observation'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const ObservationFormScreen()));
            },
          ),
          ListTile(
            leading: const Icon(Icons.delete_sweep_rounded, color: Colors.orangeAccent),
            title: const Text('Clear Local Data', style: TextStyle(color: Colors.orangeAccent)),
            onTap: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Clear Local Data?'),
                  content: const Text('This will delete all unsynced observations and fields on this device. This cannot be undone.'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                    TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Clear', style: TextStyle(color: Colors.red))),
                  ],
                ),
              );
              if (confirm == true) {
                await appState.clearLocalData();
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Local data cleared')));
              }
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: Colors.redAccent),
            title: const Text('Logout', style: TextStyle(color: Colors.redAccent)),
            onTap: () async {
              await appState.logout();
              Navigator.pop(context);
              Navigator.pushReplacementNamed(context, '/login');
            },
          ),
        ],
      ),
    );
  }
}
