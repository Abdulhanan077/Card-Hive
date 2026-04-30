import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mycardhive_mobile/models/rate.dart';
import 'package:mycardhive_mobile/services/rates_service.dart';
import 'package:mycardhive_mobile/services/trade_service.dart';
import 'package:mycardhive_mobile/services/category_utils.dart';
import 'package:provider/provider.dart';
import 'package:mycardhive_mobile/providers/connectivity_provider.dart';
import 'package:mycardhive_mobile/services/cache_service.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:mycardhive_mobile/utils/permission_helper.dart';
import 'package:mycardhive_mobile/ui/screens/trade_success_screen.dart';
import 'package:mycardhive_mobile/ui/widgets/modern_dropdown.dart';
import 'package:mycardhive_mobile/utils/compliance_utils.dart';

class CardEntry {
  final String id;
  String cardBrand;
  String cardCategory;
  String cardType;
  TextEditingController faceValueController;
  TextEditingController cardCodeController;
  TextEditingController serialNumberController;
  double? estimatedPayout;
  String? faceValueError;

  CardEntry({
    required this.id,
    this.cardBrand = "",
    this.cardCategory = "",
    this.cardType = "Physical",
  })  : faceValueController = TextEditingController(),
        cardCodeController = TextEditingController(),
        serialNumberController = TextEditingController();
}

class SellCardScreen extends StatefulWidget {
  const SellCardScreen({super.key});

  @override
  State<SellCardScreen> createState() => _SellCardScreenState();
}

class _SellCardScreenState extends State<SellCardScreen> {
  final TradeService _tradeService = TradeService();
  final RatesService _ratesService = RatesService();

  List<Rate> _rates = [];
  double _usdtRate = 15.0;
  bool _isLoadingRates = true;
  bool _isSubmitting = false;

  final List<CardEntry> _cards = [];
  final List<String> _imagePaths = [];
  final ImagePicker _picker = ImagePicker();

  String _payoutMethod = "MOBILE_MONEY";
  String _payoutNetwork = "";
  final _payoutPhoneController = TextEditingController();
  final _payoutNameController = TextEditingController();

  String _cryptoNetwork = "";
  String _cryptoExchange = "";
  String _cryptoReceiverIdType = "EXCHANGE_ID";
  final _cryptoReceiverIdController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchRates();
    _addCard(); // Add initial blank card
  }

  Future<void> _fetchRates() async {
    try {
      final response = await _ratesService.fetchRates();
      setState(() {
        _rates = response.rates;
        _usdtRate = response.usdtExchangeRate;
        _isLoadingRates = false;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to load live rates'), backgroundColor: Colors.red));
      setState(() => _isLoadingRates = false);
    }
  }

  void _addCard() {
    setState(() {
      _cards.add(CardEntry(id: DateTime.now().millisecondsSinceEpoch.toString()));
    });
  }

  void _removeCard(String id) {
    if (_cards.length > 1) {
      setState(() {
        _cards.removeWhere((c) => c.id == id);
      });
    }
  }

  void _updateCardCalculation(CardEntry card) {
    if (card.cardBrand.isEmpty || card.cardCategory.isEmpty || card.faceValueController.text.isEmpty) {
      card.estimatedPayout = null;
      card.faceValueError = null;
      return;
    }

    final value = double.tryParse(card.faceValueController.text);
    if (value == null) {
      card.estimatedPayout = null;
      card.faceValueError = "Invalid amount";
      return;
    }

    final error = CategoryUtils.validateCategoryAmount(value, card.cardCategory);
    card.faceValueError = error.isNotEmpty ? error : null;

    if (card.faceValueError == null) {
      // Find matching rate
      final activeRate = _rates.firstWhere(
        (r) =>
            r.cardBrand == card.cardBrand &&
            r.cardCountry == card.cardCategory &&
            (r.cardType == card.cardType || (r.cardType.isEmpty && card.cardType == "Physical")),
        orElse: () => Rate(id: 0, cardBrand: '', cardCountry: '', cardType: '', rate: 0),
      );

      if (activeRate.rate > 0) {
        card.estimatedPayout = value * activeRate.rate;
      } else {
        card.estimatedPayout = null;
      }
    } else {
      card.estimatedPayout = null;
    }
  }

  double get _totalPayout => _cards.fold(0.0, (sum, c) => sum + (c.estimatedPayout ?? 0.0));

  void _showImageSourcePicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).cardColor,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Text("Select Image Source", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            ListTile(
              leading: const CircleAvatar(backgroundColor: Color(0xFFEFF6FF), child: Icon(Icons.photo_library, color: Color(0xFF2563EB))),
              title: const Text("Upload from Gallery", style: TextStyle(fontWeight: FontWeight.w500)),
              onTap: () { Navigator.pop(ctx); _pickImages(); },
            ),
            ListTile(
              leading: const CircleAvatar(backgroundColor: Color(0xFFF0FDF4), child: Icon(Icons.camera_alt, color: Color(0xFF10B981))),
              title: const Text("Take Live Photo", style: TextStyle(fontWeight: FontWeight.w500)),
              onTap: () { Navigator.pop(ctx); _takePhoto(); },
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Future<void> _pickImages() async {
    final hasPermission = await PermissionHelper.requestPhotos(context);
    if (!hasPermission) return;

    try {
      final List<XFile> images = await _picker.pickMultiImage();
      if (images.isNotEmpty) {
        setState(() {
          _imagePaths.addAll(images.map((e) => e.path));
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error picking images: $e")));
      }
    }
  }

  Future<void> _takePhoto() async {
    final hasPermission = await PermissionHelper.requestCamera(context);
    if (!hasPermission) return;

    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.camera, imageQuality: 70);
      if (image != null) {
        setState(() {
          _imagePaths.add(image.path);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error taking photo: $e")));
      }
    }
  }

  Future<void> _submitTrade() async {
    // Basic validation
    if (_cards.any((c) => c.faceValueError != null)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fix face value errors first')));
      return;
    }

    final hasPhysicalCard = _cards.any((c) => c.cardType == "Physical");
    if (hasPhysicalCard && _imagePaths.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Upload at least one receipt or card image for your Physical cards')));
      return;
    }

    // Build payload params
    Map<String, String> payoutParams = {};
    if (_payoutMethod == "MOBILE_MONEY") {
      if (_payoutNetwork.isEmpty || _payoutPhoneController.text.isEmpty || _payoutNameController.text.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill out all Mobile Money fields')));
        return;
      }
      payoutParams = {
        'payoutNetwork': _payoutNetwork,
        'payoutPhoneNumber': _payoutPhoneController.text.trim(),
        'payoutAccountName': _payoutNameController.text.trim(),
      };
    } else {
      if (_cryptoNetwork.isEmpty || _cryptoExchange.isEmpty || _cryptoReceiverIdController.text.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill all Crypto fields')));
        return;
      }
      payoutParams = {
        'cryptoCoin': 'USDT',
        'cryptoNetwork': _cryptoNetwork,
        'cryptoExchange': _cryptoExchange,
        'cryptoReceiverIdType': _cryptoReceiverIdType,
        'cryptoReceiverId': _cryptoReceiverIdController.text.trim(),
      };
    }

    List<Map<String, dynamic>> cardsData = _cards.map((c) {
      return {
        'cardBrand': c.cardBrand,
        'cardCategory': c.cardCategory,
        'cardType': c.cardType,
        'faceValue': double.parse(c.faceValueController.text),
        'cardCode': c.cardCodeController.text.trim(),
        'serialNumber': c.serialNumberController.text.trim(),
      };
    }).toList();

    setState(() => _isSubmitting = true);

    if (mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => WillPopScope(
          onWillPop: () async => false,
          child: AlertDialog(
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const CircularProgressIndicator(),
                const SizedBox(height: 20),
                const Text("Submitting Trade...", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                const SizedBox(height: 10),
                const Text("Please stay on this screen while we upload your images. This may take a moment depending on your internet speed.", textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: Colors.grey)),
              ],
            ),
          ),
        ),
      );
    }

    final connectivity = Provider.of<ConnectivityProvider>(context, listen: false);
    
    if (connectivity.isOffline) {
      // Offline Flow: Queue the trade
      final tradeData = {
        'cards': cardsData,
        'payoutMethod': _payoutMethod,
        'payoutDetails': payoutParams,
      };
      
      await CacheService.queueTrade(tradeData, _imagePaths);
      
      if (mounted) Navigator.pop(context); // Close loading dialog
      setState(() => _isSubmitting = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text("No Internet. Trade Queued - Will sync automatically when online."),
          backgroundColor: Colors.orange,
        ));
        Navigator.pop(context);
      }
      return;
    }

    // Online Flow: Submit directly
    final res = await _tradeService.submitTrade(
      cards: cardsData,
      payoutMethod: _payoutMethod,
      payoutDetails: payoutParams,
      imagePaths: _imagePaths,
    );

    if (mounted) Navigator.pop(context); // Close loading dialog
    setState(() => _isSubmitting = false);

    if (!mounted) return;
    if (res['success']) {
      // Navigate to success screen
      final card = _cards[0];
      final amountStr = "${card.faceValueController.text} ${card.cardCategory.split(' ')[0]}";
      
      String payoutInfo = "";
      if (_payoutMethod == "MOBILE_MONEY") {
        payoutInfo = "$_payoutNetwork (${_payoutPhoneController.text})";
      } else {
        payoutInfo = "Crypto (USDT)";
      }

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => TradeSuccessScreen(
            tradeId: res['tradeId'],
            cardBrand: card.cardBrand,
            amount: amountStr,
            payoutMethod: payoutInfo,
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['error']), backgroundColor: Colors.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (_isLoadingRates) {
      return Scaffold(backgroundColor: theme.scaffoldBackgroundColor, body: const Center(child: CircularProgressIndicator()));
    }

    final availableBrands = _rates.map((e) => e.cardBrand).toSet().toList()..sort();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text("Sell Gift Card", style: TextStyle(color: theme.colorScheme.onSurface, fontWeight: FontWeight.bold)),
        backgroundColor: theme.cardColor,
        elevation: 0,
        leading: IconButton(icon: Icon(Icons.arrow_back_ios_new, color: theme.colorScheme.onSurface), onPressed: () => Navigator.pop(context)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Column(
          children: [
            // Header instructions
            const Text("List your gift card below to submit it for review and instant payout.", style: TextStyle(color: Color(0xFF64748B), fontSize: 15)),
            const SizedBox(height: 24),

            // Payout Container
            _buildContainerNode(
              title: "1. Payout Information",
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ModernDropdown(
                    label: "Select Payout Method",
                    hint: "Method",
                    value: _payoutMethod,
                    items: const ["MOBILE_MONEY", "CRYPTO"],
                    isDark: isDark,
                    onChanged: (val) => setState(() => _payoutMethod = val!),
                  ),
                  const SizedBox(height: 16),
                  
                   if (_payoutMethod == "MOBILE_MONEY") ...[
                    ModernDropdown(
                      label: "Payout Network",
                      hint: "Select Network",
                      value: _payoutNetwork.isEmpty ? null : _payoutNetwork,
                      items: const ["MTN", "Telecel"],
                      isDark: isDark,
                      onChanged: (val) => setState(() => _payoutNetwork = val!),
                    ),
                    const SizedBox(height: 12),
                    _buildLabel("Mobile Money Number", theme, isDark),
                    _buildTextField(theme: theme, isDark: isDark, controller: _payoutPhoneController, hint: "055 123 4567"),
                    const SizedBox(height: 12),
                    _buildLabel("Account Name", theme, isDark),
                    _buildTextField(theme: theme, isDark: isDark, controller: _payoutNameController, hint: "Registered name"),
                  ] else ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: isDark ? theme.scaffoldBackgroundColor : const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8), border: Border.all(color: theme.dividerColor)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                ModernDropdown(
                                  label: "Network",
                                  hint: "Select",
                                  value: _cryptoNetwork.isEmpty ? null : _cryptoNetwork,
                                  items: const ["TRC20", "BEP20"],
                                  isDark: isDark,
                                  onChanged: (val) => setState(() => _cryptoNetwork = val!),
                                ),
                              ])),
                              const SizedBox(width: 12),
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                ModernDropdown(
                                  label: "Exchange",
                                  hint: "Select",
                                  value: _cryptoExchange.isEmpty ? null : _cryptoExchange,
                                  items: const ["NOONES", "BINANCE", "OKX", "BYBIT", "KUCOIN", "OTHER"],
                                  isDark: isDark,
                                  onChanged: (val) => setState(() => _cryptoExchange = val!),
                                ),
                              ])),
                            ],
                          ),
                          const SizedBox(height: 12),
                          ModernDropdown(
                            label: "Receiving Method",
                            hint: "Select",
                            value: _cryptoReceiverIdType,
                            items: const ["EXCHANGE_ID", "WALLET_ADDRESS"],
                            isDark: isDark,
                            onChanged: (val) => setState(() => _cryptoReceiverIdType = val!),
                          ),
                          const SizedBox(height: 12),
                          _buildLabel("Account Identifier", theme, isDark),
                          _buildTextField(theme: theme, isDark: isDark, controller: _cryptoReceiverIdController, hint: "Wallet Address or ID"),
                        ]
                      )
                    )
                  ]
                ],
              )
            ),

            const SizedBox(height: 16),

            // Cards Container Iterator
            _buildContainerNode(
              title: "2. Gift Card Details",
              child: Column(
                children: _cards.asMap().entries.map((entry) {
                  final index = entry.key;
                  final card = entry.value;

                  // Compute available categories dynamically
                  final availableCategories = _rates
                      .where((r) => r.cardBrand == card.cardBrand && (r.cardType == card.cardType || (r.cardType.isEmpty && card.cardType == "Physical")))
                      .map((r) => r.cardCountry)
                      .toSet()
                      .toList()
                      ..sort(CategoryUtils.sortCategories);

                  return Container(
                    margin: const EdgeInsets.only(bottom: 24),
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      border: Border.all(color: theme.dividerColor), 
                      borderRadius: BorderRadius.circular(16), 
                      color: isDark ? theme.scaffoldBackgroundColor : const Color(0xFFF8FAFC)
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text("Card Details", style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold, fontSize: 16)),
                          ],
                        ),
                        const SizedBox(height: 16),
                        
                        ModernDropdown(
                          label: "Card Brand",
                          hint: "Select Card Brand",
                          value: card.cardBrand.isEmpty ? null : card.cardBrand,
                          items: availableBrands,
                          isDark: isDark,
                          onChanged: (val) => setState(() { card.cardBrand = val!; card.cardCategory = ""; _updateCardCalculation(card); }),
                        ),
                        const SizedBox(height: 16),

                        ModernDropdown(
                          label: "Type",
                          hint: "Select Type",
                          value: card.cardType,
                          items: const ["Physical", "E-code"],
                          isDark: isDark,
                          onChanged: (val) => setState(() { card.cardType = val!; card.cardCategory = ""; _updateCardCalculation(card); }),
                        ),
                        const SizedBox(height: 16),

                        ModernDropdown(
                          label: "Currency & Category",
                          hint: card.cardBrand.isEmpty ? "Select Brand First" : "Select Category...",
                          value: card.cardCategory.isEmpty ? null : card.cardCategory,
                          items: availableCategories,
                          isDark: isDark,
                          onChanged: (val) {
                            setState(() {
                              card.cardCategory = val!;
                              final exact = CategoryUtils.getExactCategoryAmount(card.cardCategory);
                              if (exact != null) {
                                card.faceValueController.text = exact.toString();
                              } else {
                                card.faceValueController.clear();
                              }
                              _updateCardCalculation(card);
                            });
                          },
                        ),
                        const SizedBox(height: 16),

                        _buildLabel("Exact Face Value Amount", theme, isDark),
                        _buildTextField(
                          theme: theme, isDark: isDark,
                          controller: card.faceValueController,
                          hint: "e.g. 100",
                          keyboardType: TextInputType.number,
                          enabled: CategoryUtils.getExactCategoryAmount(card.cardCategory) == null,
                          onChanged: (_) => setState(() => _updateCardCalculation(card)),
                        ),
                        if (card.faceValueError != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text(card.faceValueError!, style: const TextStyle(color: Colors.red, fontSize: 12))),
                        
                        const SizedBox(height: 16),
                        _buildLabel("Card Code / PIN", theme, isDark),
                        _buildTextField(theme: theme, isDark: isDark, controller: card.cardCodeController, hint: "Enter card code"),
                        
                        if (card.estimatedPayout != null) ...[
                          const SizedBox(height: 16),
                          Text("Estimated Card Payout: GH₵ ${card.estimatedPayout!.toStringAsFixed(2)}", textAlign: TextAlign.right, style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 14)),
                        ]
                      ],
                    ),
                  );
                }).toList(),
              )
            ),

            if (_totalPayout > 0)
              Container(
                margin: const EdgeInsets.only(top: 16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: isDark ? Colors.green.withOpacity(0.1) : const Color(0xFFF0FDF4), border: Border.all(color: const Color(0xFF10B981), width: 2), borderRadius: BorderRadius.circular(12)),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text("Total Payout", style: TextStyle(color: theme.colorScheme.onSurface, fontWeight: FontWeight.w500)),
                      Text("GH₵ ${_totalPayout.toStringAsFixed(2)}", style: const TextStyle(color: Color(0xFF2563EB), fontSize: 24, fontWeight: FontWeight.bold)),
                    ]),
                    if (_payoutMethod == "CRYPTO")
                      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text("Approx. USDT", style: TextStyle(color: theme.colorScheme.onSurface, fontWeight: FontWeight.w500)),
                        Text("≈ \$${(_totalPayout / _usdtRate).toStringAsFixed(2)}", style: const TextStyle(color: Color(0xFF10B981), fontSize: 18, fontWeight: FontWeight.bold)),
                      ]),
                  ],
                ),
              ),

            const SizedBox(height: 16),

            // Evidence Upload Container
            _buildContainerNode(
              title: "3. Evidence & Media",
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text("Upload images (front/back) and receipts for the card listed above.", style: TextStyle(color: isDark ? Colors.white54 : const Color(0xFF64748B), fontSize: 14)),
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: _showImageSourcePicker,
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: isDark ? theme.scaffoldBackgroundColor : const Color(0xFFF8FAFC),
                        border: Border.all(color: theme.dividerColor, style: BorderStyle.none),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        children: [
                          Icon(Icons.camera_enhance_rounded, size: 48, color: theme.colorScheme.primary.withOpacity(0.5)),
                          const SizedBox(height: 8),
                          const Text("Tap to upload proof for the card", style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w500)),
                          if (_imagePaths.isNotEmpty) ...[
                            const SizedBox(height: 16),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: _imagePaths.map((p) => ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.file(File(p), width: 60, height: 60, fit: BoxFit.cover),
                              )).toList(),
                            )
                          ]
                        ],
                      ),
                    ),
                  ),
                ],
              )
            ),

            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submitTrade,
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), elevation: 0),
                child: _isSubmitting 
                    ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                    : const Text("Submit Trade", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildContainerNode({required String title, required Widget child, Widget? trailing}) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: theme.cardColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: theme.dividerColor), boxShadow: isDark ? [] : const [BoxShadow(color: Color(0x0D000000), offset: Offset(0, 1), blurRadius: 2)]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
              if (trailing != null) trailing,
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      )
    );
  }

  Widget _buildLabel(String text, ThemeData theme, bool isDark) {
    return Padding(padding: const EdgeInsets.only(bottom: 6.0), child: Text(text, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: isDark ? Colors.white70 : const Color(0xFF0F172A))));
  }

  Widget _buildTextField({required TextEditingController controller, required String hint, TextInputType? keyboardType, bool enabled = true, void Function(String)? onChanged, required ThemeData theme, required bool isDark}) {
    return TextField(
      controller: controller,
      enabled: enabled,
      keyboardType: keyboardType,
      onChanged: onChanged,
      style: TextStyle(color: theme.colorScheme.onSurface, fontSize: 14),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: isDark ? Colors.white24 : const Color(0xFF94A3B8)),
        filled: true,
        fillColor: enabled ? (isDark ? theme.scaffoldBackgroundColor : const Color(0xFFF8FAFC)) : (isDark ? theme.cardColor : const Color(0xFFF1F5F9)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: theme.dividerColor)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: theme.dividerColor)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF2563EB))),
        disabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: theme.dividerColor)),
      ),
    );
  }

  Widget _buildRadioTile(String value, String label, ThemeData theme, bool isDark) {
    final isSelected = _payoutMethod == value;
    return GestureDetector(
      onTap: () => setState(() => _payoutMethod = value),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected ? (isDark ? theme.scaffoldBackgroundColor : const Color(0xFFF1F5F9)) : Colors.transparent,
          border: Border.all(color: isSelected ? const Color(0xFF2563EB) : theme.dividerColor),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 20, height: 20,
              child: Radio<String>(
                value: value,
                groupValue: _payoutMethod,
                onChanged: (val) => setState(() => _payoutMethod = val!),
                activeColor: const Color(0xFF2563EB),
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(child: Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: theme.colorScheme.onSurface))),
          ],
        ),
      ),
    );
  }
}
