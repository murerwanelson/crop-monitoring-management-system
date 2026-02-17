import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../services/local_db.dart';
import '../services/supabase_service.dart';
import '../providers/sync_provider.dart';
import '../providers/ui_provider.dart';
import 'observation_detail_screen.dart';
import 'observation_form_screen.dart';
import 'storage_management_screen.dart';
import '../widgets/app_drawer.dart';
import '../widgets/shimmer_loading.dart';

class ObservationsListScreen extends StatefulWidget {
  const ObservationsListScreen({Key? key}) : super(key: key);

  @override
  State<ObservationsListScreen> createState() => _ObservationsListScreenState();
}

class _ObservationsListScreenState extends State<ObservationsListScreen> {
  final SupabaseService _supabase = SupabaseService();
  final LocalDB _localDb = LocalDB();

  List<Map<String, dynamic>> _history = [];
  bool _isLoading = true;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() => _isLoading = true);

    final syncProvider = context.read<SyncProvider>();

    try {
      // 1. Fetch Local Data (Fast, Offline-first)
      // This includes both unsynced drafts and synced records stored locally
      final localRecords = await _localDb.getAllObservations();
      
      // Map local DB structure to a unified model for the list
      List<Map<String, dynamic>> combinedList = localRecords.map((record) {
        final data = jsonDecode(record['data']);
        return {
          'id': record['id'], // Local ID
          'title': data['field_identification']?['field_name'] ?? 'Unnamed Field',
          'subtitle': '${data['field_identification']?['section_name'] ?? ''} - ${data['field_identification']?['block_id'] ?? ''}',
          'date': DateTime.tryParse(data['field_identification']?['date_recorded'] ?? ''),
          'status': record['synced'] == 1 ? 'Synced' : 'Draft',
          'crop': data['crop_information']?['crop_type'] ?? 'Unknown Crop',
          'is_local': true,
          'raw_data': data,
        };
      }).toList();

      // 2. Fetch Remote Data (if online) to get history not on device
      if (syncProvider.isOnline) {
        try {
          final remoteRecords = await _supabase.getRecentObservations();
          
          for (var remote in remoteRecords) {
            // Check if this record already exists in local list (by some unique key if possible, 
            // but for now we'll rely on the fact that local DB stores what we *created* here).
            // A robust sync would use UUIDs.
            // For this view, we'll append remote records that don't match a local "synced" record's client_uuid if present.
            
            // Simplified: Add remote records to list, marking them as 'History'
            // We might have duplicates if local DB has synced records. 
            // Logic: If local DB has a synced record with same client_uuid, prefer local (or merge).
            // Since we implement "view history", let's just show remote records that aren't in local.
            
            bool existsLocally = combinedList.any((local) => 
              local['raw_data']['client_uuid'] == remote['client_uuid']);

            if (!existsLocally) {
              combinedList.add({
                'id': remote['id'], // Remote UUID or ID
                'title': remote['field_name'] ?? 'Unnamed',
                'subtitle': '${remote['section_name'] ?? ''} - ${remote['block_id'] ?? ''}',
                'date': DateTime.tryParse(remote['date_recorded'] ?? remote['created_at'] ?? ''),
                'status': 'History',
                'crop': (remote['crop_information'] as List?)?.isNotEmpty == true 
                    ? remote['crop_information'][0]['crop_type'] 
                    : 'Unknown',
                'is_local': false,
                'raw_data': remote,
              });
            }
          }
        } catch (e) {
          print('Error fetching remote history: $e');
        }
      }

      // 3. Sort by Date (Newest first)
      combinedList.sort((a, b) {
        final dateA = a['date'] as DateTime?;
        final dateB = b['date'] as DateTime?;
        if (dateA == null) return 1;
        if (dateB == null) return -1;
        return dateB.compareTo(dateA);
      });

      if (mounted) {
        setState(() {
          _history = combinedList;
          _isLoading = false;
        });
      }

    } catch (e) {
      print('Error loading history: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Filter logic
    final displayedList = _searchQuery.isEmpty 
      ? _history 
      : _history.where((item) {
          final title = item['title'].toString().toLowerCase();
          final sub = item['subtitle'].toString().toLowerCase();
          final crop = item['crop'].toString().toLowerCase();
          final q = _searchQuery.toLowerCase();
          return title.contains(q) || sub.contains(q) || crop.contains(q);
        }).toList();

    final syncProvider = context.read<SyncProvider>();
    final uiProvider = context.read<UIProvider>();
    final bool isFieldMode = uiProvider.isFieldMode;

    return Scaffold(
      backgroundColor: isFieldMode ? Colors.white : Colors.white,
      appBar: AppBar(
        title: Text('Observation History', 
          style: TextStyle(
            color: isFieldMode ? Colors.black : const Color(0xFF1B5E20), 
            fontWeight: FontWeight.bold, 
            letterSpacing: -0.5,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: IconThemeData(color: isFieldMode ? Colors.black : const Color(0xFF1B5E20)),
        actions: [
          if (syncProvider.isSyncing)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
              ),
            ),
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.cloud_sync_rounded),
                onPressed: () => syncProvider.startSync(),
              ),
              if (syncProvider.unsyncedCount > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(color: Colors.orange, shape: BoxShape.circle),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      '${syncProvider.unsyncedCount}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadHistory,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(70),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
            child: Container(
              decoration: BoxDecoration(
                boxShadow: isFieldMode ? [] : [
                  BoxShadow(
                    color: const Color(0xFF1B5E20).withValues(alpha: 0.08),
                    blurRadius: 15,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: TextField(
                onChanged: (v) => setState(() => _searchQuery = v),
                decoration: InputDecoration(
                  hintText: 'Search fields, crops...',
                  hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 15),
                  prefixIcon: Icon(Icons.search_rounded, color: isFieldMode ? Colors.black : const Color(0xFF2E7D32)),
                  filled: true,
                  fillColor: isFieldMode ? Colors.white : const Color(0xFFF1F8E9),
                  enabledBorder: isFieldMode ? OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Colors.black, width: 2),
                  ) : OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: isFieldMode ? OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: Colors.black, width: 3),
                  ) : OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: isFieldMode ? const BorderSide(color: Colors.black) : BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(vertical: 0),
                ),
              ),
            ),
          ),
        ),
      ),
      drawer: const AppDrawer(),
      body: _isLoading 
        ? ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            itemCount: 5,
            itemBuilder: (context, index) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: ShimmerLoading.card(height: 100),
            ),
          )
        : Column(
            children: [
              _buildStatusDashboard(context),
              Expanded(
                child: displayedList.isEmpty 
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      onRefresh: _loadHistory,
                      color: const Color(0xFF2E7D32),
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                        itemCount: displayedList.length,
                        itemBuilder: (context, index) {
                          final item = displayedList[index];
                          return _buildHistoryCard(item);
                        },
                      ),
                    ),
              ),
            ],
          ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const ObservationFormScreen()),
          );
          _loadHistory();
        },
        backgroundColor: const Color(0xFF2E7D32),
        elevation: 4,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text('New Entry', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
      ),
    );
  }

  Widget _buildStatusDashboard(BuildContext context) {
    final syncProvider = context.watch<SyncProvider>();
    final uiProvider = context.watch<UIProvider>();
    final isFieldMode = uiProvider.isFieldMode;
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      decoration: BoxDecoration(
        color: isFieldMode ? Colors.white : Colors.white,
        border: Border(bottom: BorderSide(color: isFieldMode ? Colors.black26 : Colors.grey.shade100, width: isFieldMode ? 2 : 1)),
      ),
      child: Row(
        children: [
          // Sync Progress Card
          Expanded(
            child: _StatusCard(
              title: 'Sync Status',
              icon: Icons.sync_rounded,
              label: '${syncProvider.syncedCount} / ${syncProvider.totalRecords}',
              color: isFieldMode ? Colors.black : Colors.green,
              progress: syncProvider.totalRecords == 0 ? 0 : syncProvider.syncedCount / syncProvider.totalRecords,
            ),
          ),
          const SizedBox(width: 16),
          // Storage Info Card
          Expanded(
            child: GestureDetector(
              onTap: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const StorageManagementScreen()),
                ).then((_) async {
                      await syncProvider.startSync();
                      await syncProvider.checkUnsynced();
                });
              },
              child: _StatusCard(
                title: 'Photos',
                icon: Icons.photo_library_rounded,
                label: '${syncProvider.storageSizeMB.toStringAsFixed(1)} MB',
                color: isFieldMode ? Colors.black : Colors.blue,
                iconColor: isFieldMode ? Colors.black : Colors.blue.shade700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryCard(Map<String, dynamic> item) {
    final status = item['status'];
    Color statusColor;
    IconData statusIcon;

    switch (status) {
      case 'Draft':
        statusColor = Colors.orange;
        statusIcon = Icons.edit_note;
        break;
      case 'Synced':
        statusColor = Colors.blue;
        statusIcon = Icons.cloud_done;
        break;
      case 'History':
      default:
        statusColor = Colors.green;
        statusIcon = Icons.history;
        break;
    }

    final isFieldMode = context.read<UIProvider>().isFieldMode;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: isFieldMode ? 0 : 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: isFieldMode ? Colors.black : const Color(0xFF2E7D32).withValues(alpha: 0.1), width: isFieldMode ? 2 : 1),
      ),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ObservationDetailScreen(
                observationId: item['id'],
                isOffline: item['is_local'],
              ),
            ),
          );
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: isFieldMode ? Colors.black12 : const Color(0xFFE8F5E9),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.grass_rounded, color: isFieldMode ? Colors.black : const Color(0xFF2E7D32)),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item['title'],
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: isFieldMode ? Colors.black : const Color(0xFF212121),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item['subtitle'],
                      style: TextStyle(
                        color: isFieldMode ? Colors.black54 : const Color(0xFF757575),
                        fontSize: 13,
                        fontWeight: isFieldMode ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.calendar_today, size: 12, color: isFieldMode ? Colors.black : Colors.grey[600]),
                        const SizedBox(width: 4),
                        Text(
                          item['date'] != null 
                            ? DateFormat('MMM dd, yyyy').format(item['date']) 
                            : 'No Date',
                          style: TextStyle(color: isFieldMode ? Colors.black : Colors.grey[600], fontSize: 12, fontWeight: isFieldMode ? FontWeight.bold : FontWeight.normal),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isFieldMode ? Colors.black : statusColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            children: [
                              Icon(statusIcon, size: 10, color: isFieldMode ? Colors.white : statusColor),
                              const SizedBox(width: 4),
                              Text(
                                status,
                                style: TextStyle(
                                  color: isFieldMode ? Colors.white : statusColor,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: isFieldMode ? Colors.black : const Color(0xFFBDBDBD)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    final isFieldMode = context.watch<UIProvider>().isFieldMode;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(30),
            decoration: BoxDecoration(
              color: isFieldMode ? Colors.black.withValues(alpha: 0.05) : const Color(0xFFE8F5E9),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.inventory_2_outlined,
              size: 80,
              color: isFieldMode ? Colors.black : const Color(0xFF2E7D32),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'No History Found',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: isFieldMode ? Colors.black : const Color(0xFF1B5E20),
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Records will appear here as you collect data.',
            textAlign: TextAlign.center,
            style: TextStyle(color: isFieldMode ? Colors.black : Colors.grey.shade500, fontSize: 16, fontWeight: isFieldMode ? FontWeight.bold : FontWeight.normal),
          ),
          const SizedBox(height: 32),
          OutlinedButton.icon(
            onPressed: _loadHistory,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Refresh List'),
            style: OutlinedButton.styleFrom(
              foregroundColor: isFieldMode ? Colors.black : const Color(0xFF2E7D32),
              side: BorderSide(color: isFieldMode ? Colors.black : const Color(0xFFE8F5E9), width: 2),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
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
    final bool isFieldMode = context.watch<UIProvider>().isFieldMode;
    
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: isFieldMode ? [] : [
          BoxShadow(
            color: color.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: isFieldMode ? Colors.black87 : color.withValues(alpha: 0.1), width: isFieldMode ? 2 : 1),
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
                backgroundColor: color.withValues(alpha: 0.1),
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
