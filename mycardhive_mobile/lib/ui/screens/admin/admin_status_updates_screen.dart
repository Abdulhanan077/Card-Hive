import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mycardhive_mobile/services/admin_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class AdminStatusUpdatesScreen extends StatefulWidget {
  const AdminStatusUpdatesScreen({super.key});

  @override
  State<AdminStatusUpdatesScreen> createState() => _AdminStatusUpdatesScreenState();
}

class _AdminStatusUpdatesScreenState extends State<AdminStatusUpdatesScreen> {
  final AdminService _adminService = AdminService();
  final ImagePicker _picker = ImagePicker();
  
  List<Map<String, dynamic>> _updates = [];
  bool _isLoading = true;
  bool _isPosting = false;
  
  final TextEditingController _messageController = TextEditingController();
  File? _selectedImage;

  final List<Color> _cardColors = [
    const Color(0xFF6366f1),
    const Color(0xFF3b82f6),
    const Color(0xFFef4444),
    const Color(0xFF10b981),
    const Color(0xFFec4899),
    const Color(0xFF8b5cf6),
  ];

  @override
  void initState() {
    super.initState();
    _loadUpdates();
  }

  Future<void> _loadUpdates() async {
    setState(() => _isLoading = true);
    final res = await _adminService.fetchStatusUpdatesAdmin();
    if (res['success'] == true) {
      setState(() {
        _updates = List<Map<String, dynamic>>.from(res['updates'] ?? []);
        _isLoading = false;
      });
    } else {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _pickImage() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (image != null) {
      setState(() {
        _selectedImage = File(image.path);
      });
    }
  }

  Future<void> _postUpdate() async {
    if (_messageController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Please enter a message")));
      return;
    }

    setState(() => _isPosting = true);
    
    final res = await _adminService.postStatusUpdate(
      _messageController.text,
      imagePath: _selectedImage?.path,
    );

    setState(() => _isPosting = false);

    if (res != null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Status posted successfully!")));
      _messageController.clear();
      setState(() => _selectedImage = null);
      _loadUpdates();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Failed to post update")));
    }
  }

  Future<void> _deleteUpdate(int id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Delete Status?"),
        content: const Text("This update will be removed for all users. Continue?"),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Cancel")),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text("Delete"),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final res = await _adminService.deleteStatusUpdate(id);
    if (res != null) {
      _loadUpdates();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Status deleted")));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text("Status Updates", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
      body: Column(
        children: [
          _buildPostInput(isDark, theme),
          const Divider(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadUpdates,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _updates.isEmpty
                      ? _buildEmptyState(isDark)
                      : ListView.builder(
                          padding: const EdgeInsets.all(20),
                          itemCount: _updates.length,
                          itemBuilder: (context, index) {
                            return _buildStatusCard(_updates[index], isDark, theme, index);
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPostInput(bool isDark, ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(20),
      color: isDark ? const Color(0xFF1E293B).withOpacity(0.5) : Colors.white.withOpacity(0.5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _messageController,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: "Post a broadcast message / payment proof...",
              hintStyle: GoogleFonts.outfit(fontSize: 14),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              filled: true,
              fillColor: isDark ? const Color(0xFF1E293B) : Colors.grey.withOpacity(0.1),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              IconButton(
                onPressed: _pickImage,
                icon: Icon(Icons.image_outlined, color: theme.primaryColor),
                tooltip: "Add Image",
              ),
              if (_selectedImage != null) ...[
                const SizedBox(width: 8),
                Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.file(_selectedImage!, width: 40, height: 40, fit: BoxFit.cover),
                    ),
                    Positioned(
                      top: -10,
                      right: -10,
                      child: IconButton(
                        onPressed: () => setState(() => _selectedImage = null),
                        icon: const Icon(Icons.cancel, size: 18, color: Colors.red),
                      ),
                    ),
                  ],
                ),
              ],
              const Spacer(),
              ElevatedButton(
                onPressed: _isPosting ? null : _postUpdate,
                style: ElevatedButton.styleFrom(
                  backgroundColor: theme.primaryColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 0,
                ),
                child: _isPosting 
                    ? const SizedBox(width: 15, height: 15, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text("Post Update"),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusCard(Map<String, dynamic> update, bool isDark, ThemeData theme, int index) {
    final date = DateTime.parse(update['createdAt']);
    final expires = DateTime.parse(update['expiresAt']);
    final hasImage = update['imageUrl'] != null;
    final cardColor = _cardColors[index % _cardColors.length];

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: hasImage ? (isDark ? const Color(0xFF1E293B) : Colors.white) : cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (hasImage) 
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              child: Image.network(
                update['imageUrl'],
                height: 150,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(height: 100, color: Colors.grey.withOpacity(0.2), child: const Icon(Icons.broken_image_outlined)),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  update['message'],
                  style: GoogleFonts.outfit(
                    fontSize: 15, 
                    fontWeight: FontWeight.w500,
                    color: hasImage ? (isDark ? Colors.white : Colors.black87) : Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Posted: ${DateFormat('MMM dd, HH:mm').format(date)}",
                          style: GoogleFonts.outfit(fontSize: 11, color: hasImage ? Colors.grey : Colors.white70),
                        ),
                        Text(
                          "Expires: ${DateFormat('HH:mm').format(expires)}",
                          style: GoogleFonts.outfit(fontSize: 11, color: hasImage ? Colors.grey : Colors.white70),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        Icon(Icons.visibility_outlined, size: 14, color: hasImage ? Colors.grey : Colors.white70),
                        const SizedBox(width: 4),
                        Text("${update['views']}", style: GoogleFonts.outfit(fontSize: 12, color: hasImage ? Colors.grey : Colors.white70, fontWeight: FontWeight.bold)),
                        const SizedBox(width: 12),
                        IconButton(
                          onPressed: () => _deleteUpdate(update['id']),
                          icon: const Icon(Icons.delete_outline, size: 20, color: Colors.redAccent),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.campaign_outlined, size: 64, color: isDark ? Colors.white10 : Colors.black12),
          const SizedBox(height: 16),
          Text("No active status updates", style: GoogleFonts.outfit(color: Colors.grey)),
        ],
      ),
    );
  }
}
