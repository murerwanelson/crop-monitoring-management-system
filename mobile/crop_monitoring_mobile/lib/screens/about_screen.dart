import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  static const String appName = 'Crop Monitoring App';
  static const String appVersion = '1.0.0';
  static const String supportEmail = 'support@cropmanager.com';
  static const String supportPhone = '+1234567890';

  Future<void> _launchEmail() async {
    final uri = Uri(
      scheme: 'mailto',
      path: supportEmail,
      queryParameters: {
        'subject': 'Crop Monitoring App Support',
      },
    );

    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      debugPrint('Failed to launch email client');
    }
  }

  Future<void> _launchPhone() async {
    final uri = Uri(
      scheme: 'tel',
      path: supportPhone,
    );

    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      debugPrint('Failed to launch phone dialer');
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('About'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 16),

              // App Logo
              Image.asset(
                'assets/images/logo.png',
                height: 96,
              ),

              const SizedBox(height: 16),

              Text(
                appName,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),

              Text(
                'Version $appVersion',
                style: Theme.of(context).textTheme.bodySmall,
              ),

              const SizedBox(height: 32),

              // Mission Section
              _SectionCard(
                title: 'Our Mission',
                child: Text(
                  'To empower farmers and estate managers with accurate, '
                  'real-time field data collection tools, ensuring sustainable '
                  'and efficient crop production.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),

              const SizedBox(height: 24),

              // Contact Section
              _SectionCard(
                title: 'Contact Us',
                child: Column(
                  children: [
                    _ContactTile(
                      icon: Icons.email_outlined,
                      label: supportEmail,
                      onTap: _launchEmail,
                    ),
                    const SizedBox(height: 12),
                    _ContactTile(
                      icon: Icons.phone_outlined,
                      label: supportPhone,
                      onTap: _launchPhone,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 40),

              Text(
                '© 2026 Crop Monitoring Management System',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: colorScheme.outline),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;

  const _SectionCard({
    required this.title,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class _ContactTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ContactTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      leading: Icon(icon),
      title: Text(label),
      trailing: const Icon(Icons.open_in_new, size: 18),
    );
  }
}
