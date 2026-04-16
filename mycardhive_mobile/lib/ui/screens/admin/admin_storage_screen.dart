import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/admin_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class AdminStorageScreen extends StatefulWidget {
  const AdminStorageScreen({super.key});

  @override
  State<AdminStorageScreen> createState() => _AdminStorageScreenState();
}

class _AdminStorageScreenState extends State<AdminStorageScreen> {
  final AdminService _adminService = AdminService();
  List<dynamic> _images = [];
  bool _isLoading = true;
  final Set<String> _selectedUrls = {};

  @override
  void initState() {
    super.initState();
    _loadImages();
  }

  Future<void> _loadImages() async {
    setState(() => _isLoading = true);
    final result = await _adminService.fetchStorageImages();
    if (mounted) {
      if (result['success']) {
        setState(() {
          _images = result['images'];
          _images.sort((a, b) => DateTime.parse(b['uploadedAt']).compareTo(DateTime.parse(a['uploadedAt'])));
          _isLoading = false;
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['error'] ?? "Failed to load")));
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _deleteSelected() async {
    if (_selectedUrls.isEmpty) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Delete Images?"),
        content: Text("Are you sure you want to delete ${_selectedUrls.length} image(s)? This action is permanent and only images older than 3 days will actually be removed."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Cancel")),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text("Delete", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold))),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isLoading = true);
      final result = await _adminService.deleteStorageImages(_selectedUrls.toList());
      if (mounted) {
        if (result['success']) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Deletion successful!"), backgroundColor: Colors.green));
          _selectedUrls.clear();
          _loadImages();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['error'] ?? "Failed to delete")));
          setState(() => _isLoading = false);
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text("Storage Management", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [
          if (_selectedUrls.isNotEmpty)
            IconButton(
              onPressed: _deleteSelected,
              icon: const Icon(Icons.delete_outline_rounded, color: Colors.red),
            ),
          IconButton(onPressed: _loadImages, icon: const Icon(Icons.refresh_rounded)),
        ],
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : Column(
            children: [
              _buildStats(isDark),
              Expanded(
                child: _images.isEmpty
                  ? _buildEmptyState()
                  : GridView.builder(
                      padding: const EdgeInsets.all(12),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 0.8,
                      ),
                      itemCount: _images.length,
                      itemBuilder: (context, index) => _buildImageCard(_images[index], isDark),
                    ),
              ),
            ],
          ),
    );
  }

  Widget _buildStats(bool isDark) {
    final totalSize = _images.fold<double>(0, (sum, img) => sum + (img['size'] ?? 0));
    final sizeStr = (totalSize / (1024 * 1024)).toStringAsFixed(2);
    
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).appBarTheme.backgroundColor,
        borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(24), bottomRight: Radius.circular(24)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _statItem("${_images.length}", "Total Files", Icons.folder_open_rounded),
          _statItem("$sizeStr MB", "Storage Used", Icons.storage_rounded),
        ],
      ),
    );
  }

  Widget _statItem(String value, String label, IconData icon) {
    return Column(
      children: [
        Icon(icon, size: 20, color: const Color(0xFF2563EB)),
        const SizedBox(height: 4),
        Text(value, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
      ],
    );
  }

  Widget _buildImageCard(dynamic image, bool isDark) {
    final url = image['url'];
    final date = DateTime.parse(image['uploadedAt']);
    final isSelected = _selectedUrls.contains(url);
    final sizeKb = ((image['size'] ?? 0) / 1024).toStringAsFixed(1);
    
    final threeDaysAgo = DateTime.now().subtract(const Duration(days: 3));
    final canDelete = date.isBefore(threeDaysAgo);

    return InkWell(
      onTap: () {
        setState(() {
          if (isSelected) {
            _selectedUrls.remove(url);
          } else {
            _selectedUrls.add(url);
          }
        });
      },
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isSelected ? const Color(0xFF2563EB) : (isDark ? Colors.white10 : Colors.black.withOpacity(0.05)), width: isSelected ? 2 : 1),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.network(url, fit: BoxFit.cover, errorBuilder: (c, e, s) => const Icon(Icons.broken_image_rounded, color: Colors.grey)),
                  if (isSelected)
                    Container(
                      color: const Color(0xFF2563EB).withOpacity(0.2),
                      child: const Center(child: Icon(Icons.check_circle_rounded, color: Colors.white, size: 32)),
                    ),
                  Positioned(
                    top: 8, left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(4)),
                      child: Text("${image['pathname'].split('.').last.toUpperCase()}", style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(DateFormat('MMM dd, yyyy').format(date.toLocal()), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("$sizeKb KB", style: const TextStyle(fontSize: 10, color: Colors.grey)),
                      if (!canDelete)
                        const Icon(Icons.lock_clock_rounded, size: 12, color: Colors.orange),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.cloud_off_rounded, size: 64, color: Colors.grey.withOpacity(0.1)),
          const SizedBox(height: 16),
          const Text("No images found in storage.", style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}
