import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';

import '../services/api_service.dart';
import '../services/local_db.dart';
import '../providers/app_state.dart';
import 'observation_detail_screen.dart';
import 'observation_form_screen.dart';
import 'field_form_screen.dart';
import '../widgets/app_drawer.dart';

class ObservationsListScreen extends StatefulWidget {
  const ObservationsListScreen({Key? key}) : super(key: key);

  @override
  State<ObservationsListScreen> createState() => _ObservationsListScreenState();
}

class _ObservationsListScreenState extends State<ObservationsListScreen> {
  final ApiService _api = ApiService();
  final LocalDB _localDb = LocalDB();

  List<dynamic> _observations = [];
  List<dynamic> _filteredObservations = [];
  bool _isLoading = true;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadObservations();
  }

  Future<void> _loadObservations() async {
    setState(() => _isLoading = true);
    
    // Trigger sync if online
    final appState = context.read<AppState>();
    if (appState.isOnline && appState.unsyncedCount > 0) {
      await appState.startSync();
    }

    try {
      final onlineData = await _api.getObservations();
      final offlineRaw = await _localDb.getUnsyncedObservations();
      
      // Parse JSON for each offline record to match the UI structure
      final offlineData = offlineRaw.map((row) {
        final Map<String, dynamic> data = jsonDecode(row['data']);
        return {
          ...data,
          'id': row['id'], // local id
          'offline': true,
          'collector_name': data['data_collector_name'], // map to what UI expects
          'field_id': data['field']?.toString() ?? data['temp_field_id'] ?? 'N/A',
        };
      }).toList();

      _observations = [...onlineData, ...offlineData];
      _applySearchFilter();
    } catch (e) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Error loading observations: $e')));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _applySearchFilter() {
    if (_searchQuery.isEmpty) {
      _filteredObservations = _observations;
    } else {
      _filteredObservations = _observations.where((obs) {
        final crop = (obs['crop_variety'] ?? '').toString().toLowerCase();
        final field = (obs['field_id'] ?? '').toString().toLowerCase();
        return crop.contains(_searchQuery.toLowerCase()) ||
            field.contains(_searchQuery.toLowerCase());
      }).toList();
    }
    setState(() {});
  }

  double _calculatePolygonArea(List coords) {
    // Approximate area in square meters using simple shoelace formula
    if (coords.length < 3) return 0.0;
    double area = 0.0;
    for (int i = 0; i < coords.length; i++) {
      final j = (i + 1) % coords.length;
      area += coords[i][0] * coords[j][1];
      area -= coords[j][0] * coords[i][1];
    }
    area = area.abs() / 2.0;
    return area; // in degrees^2 (approx), we'll convert to meters^2 below
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Crop Observations'),
        actions: [
          if (appState.isSyncing)
            const Center(
              child: Padding(
                padding: EdgeInsets.only(right: 16.0),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () async {
              await _loadObservations();
              await appState.checkUnsynced();
            },
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(50),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search by Field or Crop',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: Colors.white,
                contentPadding:
                    const EdgeInsets.symmetric(vertical: 0.0, horizontal: 16.0),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12.0),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: (value) {
                _searchQuery = value;
                _applySearchFilter();
              },
            ),
          ),
        ),
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                _buildStatusDashboard(appState),
                Expanded(
                  child: _filteredObservations.isEmpty
                      ? _emptyState()
                      : RefreshIndicator(
                          onRefresh: () async {
                            await _loadObservations();
                            await appState.checkUnsynced();
                          },
                          child: ListView.builder(
                            itemCount: _filteredObservations.length,
                            itemBuilder: (context, index) {
                              final obs = _filteredObservations[index];
                              final date = DateTime.tryParse(obs['observation_date'] ?? '');
                              final coords = obs['observation_area']?['coordinates']?[0] ?? [];
                              final areaM2 = _calculatePolygonArea(coords) * 1230000; // rough conversion
                              final areaHa = areaM2 / 10000;
                              final areaAcres = areaM2 / 4046.86;

                              return Card(
                                margin:
                                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                child: ListTile(
                                  leading: Stack(
                                    alignment: Alignment.topRight,
                                    children: [
                                      CircleAvatar(
                                        backgroundColor: Colors.green.shade100,
                                        child: const Icon(Icons.visibility, color: Colors.green),
                                      ),
                                      if (obs['offline'] == true)
                                        Positioned(
                                          right: -2,
                                          top: -2,
                                          child: CircleAvatar(
                                            radius: 8,
                                            backgroundColor: Colors.orange,
                                            child: const Icon(Icons.cloud_off,
                                                size: 12, color: Colors.white),
                                          ),
                                        ),
                                    ],
                                  ),
                                  title: Text(obs['crop_variety'] ?? 'Unknown Variety'),
                                  subtitle: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('Field: ${obs['field_id'] ?? 'N/A'}'),
                                      if (date != null)
                                        Text('Date: ${DateFormat('MMM dd, yyyy').format(date)}'),
                                      if (coords.isNotEmpty)
                                        Text(
                                            'Area: ${areaHa.toStringAsFixed(2)} ha / ${areaAcres.toStringAsFixed(2)} acres'),
                                    ],
                                  ),
                                  trailing: const Icon(Icons.chevron_right),
                                  isThreeLine: true,
                                  onTap: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) =>
                                            ObservationDetailScreen(
                                              observationId: obs['id'],
                                              isOffline: obs['offline'] == true,
                                            ),
                                      ),
                                    );
                                  },
                                ),
                              );
                            },
                          ),
                        ),
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const ObservationFormScreen()))
              .then((_) {
                _loadObservations();
                appState.checkUnsynced();
              });
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildStatusDashboard(AppState appState) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.green.shade50,
        border: Border(bottom: BorderSide(color: Colors.green.shade100)),
      ),
      child: Row(
        children: [
          // Sync Progress Card
          Expanded(
            child: _StatusCard(
              title: 'Sync Status',
              icon: Icons.sync_rounded,
              label: '${appState.syncedCount} / ${appState.totalRecords} done',
              color: Colors.green,
              progress: appState.totalRecords == 0 ? 0 : appState.syncedCount / appState.totalRecords,
            ),
          ),
          const SizedBox(width: 12),
          // Storage Info Card
          Expanded(
            child: _StatusCard(
              title: 'Photo Storage',
              icon: Icons.sd_storage_rounded,
              label: '${appState.storageSizeMB.toStringAsFixed(1)} MB used',
              color: Colors.blue,
              iconColor: Colors.blue.shade700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _emptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.grass, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text('No observations found',
              style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadObservations,
            child: const Text('Refresh'),
          ),
        ],
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final String label;
  final Color color;
  final Color? iconColor;
  final double? progress;

  const _StatusCard({
    required this.title,
    required this.icon,
    required this.label,
    required this.color,
    this.iconColor,
    this.progress,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: color.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: iconColor ?? color),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (progress != null) ...[
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress,
                backgroundColor: color.withOpacity(0.1),
                valueColor: AlwaysStoppedAnimation<Color>(color),
                minHeight: 4,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
