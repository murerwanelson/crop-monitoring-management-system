import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../providers/app_state.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  final ApiService _api = ApiService();
  bool _isLoading = true;
  Map<String, dynamic>? _dashboardStats;
  List<dynamic> _moistureTrends = [];
  Map<String, dynamic>? _growthTrends;
  String? _selectedVariety;
  int _selectedDays = 30;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final appState = context.read<AppState>();
      if (!appState.isOnline) {
        _isLoading = false;
        setState(() {});
        return;
      }

      final results = await Future.wait([
        _api.getAnalyticsDashboard(days: _selectedDays),
        _api.getMoistureTrends(days: _selectedDays),
        _api.getGrowthAnalysis(cropVariety: _selectedVariety),
      ]);

      _dashboardStats = results[0] as Map<String, dynamic>;
      _moistureTrends = results[1] as List<dynamic>;
      _growthTrends = results[2] as Map<String, dynamic>;
    } catch (e) {
      debugPrint('Analytics load error: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Growth Analytics'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: !appState.isOnline
          ? _buildOfflinePlaceholder()
          : _isLoading
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildSummaryGrid(),
                      const SizedBox(height: 24),
                      _buildMoistureChart(),
                      const SizedBox(height: 24),
                      _buildGrowthAnalysisSection(),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
    );
  }

  Widget _buildOfflinePlaceholder() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.cloud_off_rounded, size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          const Text('Analytics require a cloud connection',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const Text('Please check your internet and try again.',
              style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _loadData, child: const Text('Retry')),
        ],
      ),
    );
  }

  Widget _buildSummaryGrid() {
    final avg = _dashboardStats?['avg_measurements'] ?? {};
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _statCard('Avg Height', '${(avg['avg_height'] ?? 0).toStringAsFixed(1)} cm',
            Icons.height, Colors.green),
        _statCard('Avg Moisture', '${(avg['avg_moisture'] ?? 0).toStringAsFixed(1)}%',
            Icons.water_drop, Colors.blue),
        _statCard('Fields', '${_dashboardStats?['total_fields'] ?? 0}',
            Icons.map, Colors.orange),
        _statCard('Obs (30d)', '${_dashboardStats?['observations_in_period'] ?? 0}',
            Icons.history, Colors.purple),
      ],
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: color.withOpacity(0.1))),
      color: color.withOpacity(0.05),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 16),
                const SizedBox(width: 8),
                Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey.shade700)),
              ],
            ),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }

  Widget _buildMoistureChart() {
    if (_moistureTrends.isEmpty) return const SizedBox();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Soil Moisture Trends',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        Container(
          height: 200,
          padding: const EdgeInsets.only(right: 16, top: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade100),
          ),
          child: LineChart(
            LineChartData(
              gridData: FlGridData(show: true, horizontalInterval: 20),
              titlesData: FlTitlesData(
                show: true,
                rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    getTitlesWidget: (value, meta) {
                      if (value.toInt() % 7 != 0) return const SizedBox();
                      final date = DateTime.now().subtract(Duration(days: _selectedDays - value.toInt()));
                      return Text(DateFormat('MM/dd').format(date), style: const TextStyle(fontSize: 10));
                    },
                  ),
                ),
              ),
              borderData: FlBorderData(show: false),
              lineBarsData: [
                LineChartBarData(
                  spots: _moistureTrends.asMap().entries.map((e) {
                    return FlSpot(e.key.toDouble(), (e.value['avg_moisture'] ?? 0).toDouble());
                  }).toList(),
                  isCurved: true,
                  color: Colors.blue,
                  barWidth: 3,
                  isStrokeCapRound: true,
                  dotData: FlDotData(show: false),
                  belowBarData: BarAreaData(show: true, color: Colors.blue.withOpacity(0.1)),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGrowthAnalysisSection() {
    final trends = _growthTrends?['trends'] as List? ?? [];
    if (trends.isEmpty) return const SizedBox();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Plant Growth (Height)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            DropdownButton<String>(
              value: _selectedVariety,
              hint: const Text('Variety'),
              underline: const SizedBox(),
              items: (_dashboardStats?['crop_varieties'] as List? ?? [])
                  .map<DropdownMenuItem<String>>((varItem) {
                return DropdownMenuItem<String>(
                  value: varItem['crop_variety'],
                  child: Text(varItem['crop_variety']),
                );
              }).toList(),
              onChanged: (val) {
                setState(() => _selectedVariety = val);
                _loadData();
              },
            ),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          height: 250,
          padding: const EdgeInsets.only(right: 16, top: 16, bottom: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade100),
          ),
          child: LineChart(
            LineChartData(
              gridData: FlGridData(show: true),
              titlesData: FlTitlesData(
                show: true,
                rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    getTitlesWidget: (value, meta) {
                      if (value.toInt() % 7 != 0) return const SizedBox();
                      return Text('Day $value', style: const TextStyle(fontSize: 10));
                    },
                  ),
                ),
              ),
              lineBarsData: [
                LineChartBarData(
                  spots: trends.asMap().entries.map((e) {
                    return FlSpot(e.key.toDouble(), (e.value['avg_height'] ?? 0).toDouble());
                  }).toList(),
                  isCurved: true,
                  color: Colors.green,
                  barWidth: 4,
                  dotData: FlDotData(show: true),
                  belowBarData: BarAreaData(show: true, color: Colors.green.withOpacity(0.1)),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        _buildFertilizerImpact(),
      ],
    );
  }

  Widget _buildFertilizerImpact() {
    final fert = _growthTrends?['fertilizer_stats'] ?? {};
    final fertAvg = (fert['fertilized'] ?? 0).toDouble();
    final noFertAvg = (fert['unfertilized'] ?? 0).toDouble();

    return Card(
      elevation: 0,
      color: Colors.green.shade50,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Fertilizer Impact', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Column(
                    children: [
                      Text('${fertAvg.toStringAsFixed(1)} cm', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.green)),
                      const Text('Fertilized', style: TextStyle(fontSize: 10)),
                    ],
                  ),
                ),
                Container(width: 1, height: 30, color: Colors.green.withOpacity(0.2)),
                Expanded(
                  child: Column(
                    children: [
                      Text('${noFertAvg.toStringAsFixed(1)} cm', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.brown)),
                      const Text('Untreated', style: TextStyle(fontSize: 10)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
