import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/admin_service.dart';
import 'package:google_fonts/google_fonts.dart';

class AdminRatesScreen extends StatefulWidget {
  const AdminRatesScreen({super.key});

  @override
  State<AdminRatesScreen> createState() => _AdminRatesScreenState();
}

class _AdminRatesScreenState extends State<AdminRatesScreen> {
  final AdminService _adminService = AdminService();
  List<Map<String, dynamic>> _rates = [];
  bool _isLoading = true;
  String _searchQuery = "";

  @override
  void initState() {
    super.initState();
    _loadRates();
  }

  Future<void> _loadRates() async {
    setState(() => _isLoading = true);
    final rates = await _adminService.fetchRates();
    if (mounted) {
      setState(() {
        _rates = rates;
        _isLoading = false;
      });
    }
  }

  Future<void> _deleteRate(int id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Delete Rate?"),
        content: const Text("Are you sure you want to remove this rate configuration?"),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Cancel")),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text("Delete", style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirmed == true) {
      final result = await _adminService.deleteRate(id);
      if (result['success']) {
        _loadRates();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['error'] ?? "Failed to delete")));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final filteredRates = _rates.where((r) {
      final query = _searchQuery.toLowerCase();
      return r['cardBrand'].toString().toLowerCase().contains(query) ||
             r['cardCountry'].toString().toLowerCase().contains(query);
    }).toList();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text("Manage Rates", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(onPressed: _loadRates, icon: const Icon(Icons.refresh_rounded)),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              onChanged: (val) => setState(() => _searchQuery = val),
              decoration: InputDecoration(
                hintText: "Search brands or categories...",
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.05),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              ),
            ),
          ),
          Expanded(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator())
              : filteredRates.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: filteredRates.length,
                    itemBuilder: (context, index) => _buildRateCard(filteredRates[index], isDark),
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openRateEditor(),
        label: const Text("Add New Rate", style: TextStyle(fontWeight: FontWeight.bold)),
        icon: const Icon(Icons.add_rounded),
        backgroundColor: const Color(0xFF2563EB),
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _buildRateCard(Map<String, dynamic> rate, bool isDark) {
    final isEcode = rate['cardType'] == 'E-code';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(rate['cardBrand'], style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                          const SizedBox(width: 8),
                          _typeBadge(isEcode),
                        ],
                      ),
                      Text(rate['cardCountry'], style: const TextStyle(fontSize: 13, color: Colors.grey)),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text("${rate['rate']}x", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18, color: const Color(0xFF10B981))),
                    const Text("Payout", style: TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold)),
                  ],
                ),
              ],
            ),
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.visibility_outlined, size: 14, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text("Public: ${rate['publicRate'] ?? rate['rate']}x", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
                Row(
                  children: [
                    IconButton(
                      onPressed: () => _openRateEditor(rate: rate),
                      icon: const Icon(Icons.edit_outlined, size: 20, color: Color(0xFF2563EB)),
                      visualDensity: VisualDensity.compact,
                    ),
                    IconButton(
                      onPressed: () => _deleteRate(rate['id']),
                      icon: const Icon(Icons.delete_outline_rounded, size: 20, color: Colors.red),
                      visualDensity: VisualDensity.compact,
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _typeBadge(bool isEcode) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: (isEcode ? Colors.purple : Colors.blue).withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
      child: Text(isEcode ? "E-CODE" : "PHYSICAL", style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: isEcode ? Colors.purple : Colors.blue)),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey.withOpacity(0.1)),
          const SizedBox(height: 16),
          const Text("No rates configured.", style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }

  void _openRateEditor({Map<String, dynamic>? rate}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _RateEditorSheet(
        rate: rate,
        onSaved: () {
          Navigator.pop(context);
          _loadRates();
        },
      ),
    );
  }
}

class _RateEditorSheet extends StatefulWidget {
  final Map<String, dynamic>? rate;
  final VoidCallback onSaved;
  const _RateEditorSheet({this.rate, required this.onSaved});

  @override
  State<_RateEditorSheet> createState() => _RateEditorSheetState();
}

class _RateEditorSheetState extends State<_RateEditorSheet> {
  final AdminService _adminService = AdminService();
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _brandController;
  late TextEditingController _categoryController;
  late TextEditingController _rateController;
  late TextEditingController _publicRateController;
  String _cardType = "Physical";
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _brandController = TextEditingController(text: widget.rate?['cardBrand'] ?? "");
    _categoryController = TextEditingController(text: widget.rate?['cardCountry'] ?? "");
    _rateController = TextEditingController(text: widget.rate?['rate']?.toString() ?? "");
    _publicRateController = TextEditingController(text: widget.rate?['publicRate']?.toString() ?? "");
    _cardType = widget.rate?['cardType'] ?? "Physical";
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    final data = {
      if (widget.rate != null) 'id': widget.rate!['id'],
      'cardBrand': _brandController.text,
      'cardCountry': _categoryController.text,
      'cardType': _cardType,
      'rate': double.parse(_rateController.text),
      'publicRate': _publicRateController.text.isEmpty ? null : double.parse(_publicRateController.text),
    };

    final result = await _adminService.saveRate(data);
    if (mounted) {
      if (result['success']) {
        widget.onSaved();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['error'] ?? "Failed to save")));
      }
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : Colors.white,
        borderRadius: const BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                widget.rate == null ? "Add New Rate" : "Edit Rate",
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 20),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              _buildField("Card Brand (e.g. Amazon)", _brandController),
              _buildField("Category (e.g. USD (100) / Global)", _categoryController),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Card Type", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                        const SizedBox(height: 4),
                        DropdownButtonFormField<String>(
                          value: _cardType,
                          items: ["Physical", "E-code"].map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                          onChanged: (val) => setState(() => _cardType = val!),
                          decoration: _fieldDecoration(),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(child: _buildField("Payout Rate", _rateController, isNumeric: true)),
                ],
              ),
              _buildField("Public Rate (Optional)", _publicRateController, isNumeric: true),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isLoading ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: _isLoading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text("Save Configuration", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController controller, {bool isNumeric = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
          const SizedBox(height: 4),
          TextFormField(
            controller: controller,
            keyboardType: isNumeric ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
            validator: (v) => v!.isEmpty && label.indexOf("Optional") == -1 ? "Required" : null,
            decoration: _fieldDecoration(),
          ),
        ],
      ),
    );
  }

  InputDecoration _fieldDecoration() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InputDecoration(
      filled: true,
      fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.05),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
    );
  }
}
