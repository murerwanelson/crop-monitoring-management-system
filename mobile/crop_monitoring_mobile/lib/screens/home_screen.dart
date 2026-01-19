import 'package:flutter/material.dart';
import '../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService api = ApiService();
  List<dynamic> fields = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    loadFields();
  }

  void loadFields() async {
    try {
      fields = await api.getFields();
    } catch (e) {
      print('Error loading fields: $e');
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Fields')),
      body: loading
          ? Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: fields.length,
              itemBuilder: (context, index) {
                final field = fields[index];
                return ListTile(
                  title: Text(field['field_id']),
                  subtitle: Text('Created by user: ${field['created_by']}'),
                );
              },
            ),
    );
  }
}
