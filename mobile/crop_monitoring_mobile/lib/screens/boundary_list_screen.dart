import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/supabase_service.dart';
import '../services/local_db.dart';
import '../widgets/shimmer_loading.dart';
import '../providers/ui_provider.dart';
import '../providers/sync_provider.dart';
import '../models/observation_models.dart';
import 'boundary_map_screen.dart';

class BoundaryListScreen extends StatefulWidget {
  const BoundaryListScreen({super.key});

  @override
  State<BoundaryListScreen> createState() => _BoundaryListScreenState();
}

class _BoundaryListScreenState extends State<BoundaryListScreen> {
  @override
  Widget build(BuildContext context) {
    final syncProvider = context.watch<SyncProvider>();
    final boundaries = syncProvider.availableBlocks;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Map Boundaries'),
        backgroundColor: const Color(0xFF2E7D32),
        foregroundColor: Colors.white,
      ),
      body: boundaries.isEmpty && syncProvider.isSyncing
          ? ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: 8,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, __) => const ShimmerLoading(width: double.infinity, height: 70, borderRadius: 12),
            )
          : boundaries.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.map_outlined, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text('No boundaries found.', style: TextStyle(fontSize: 16, color: Colors.grey)),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: boundaries.length,
                  itemBuilder: (context, index) {
                    final boundary = boundaries[index];
                    final id = boundary.blockId;
                    final name = boundary.name ?? 'Unnamed Boundary';
                    
                    return Card(
                      elevation: 2,
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      child: ListTile(
                        leading: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8F5E9),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.share_location_rounded, color: Color(0xFF2E7D32)),
                        ),
                        title: Text('ID: $id', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(name),
                        trailing: const Icon(Icons.chevron_right_rounded, color: Colors.grey),
                        onTap: () {
                          Navigator.pushNamed(
                            context,
                            '/boundary-map',
                            arguments: boundary.toMap(),
                          );
                        },
                      ),
                    );
                  },
                ),
    );
  }
}

