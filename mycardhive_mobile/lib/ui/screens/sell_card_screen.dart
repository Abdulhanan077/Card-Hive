import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mycardhive_mobile/models/rate.dart';
import 'package:mycardhive_mobile/services/rates_service.dart';
import 'package:mycardhive_mobile/services/trade_service.dart';
import 'package:mycardhive_mobile/services/category_utils.dart';

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

  Future<void> _pickImages() async {
    final List<XFile> images = await _picker.pickMultiImage();
    if (images.isNotEmpty) {
      setState(() {
        _imagePaths.addAll(images.map((e) => e.path));
      });
    }
  }

  Future<void> _submitTrade() async {
    // Basic validation
    if (_cards.any((c) => c.faceValueError != null)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fix face value errors first')));
      return;
    }

    if (_imagePaths.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Upload at least one receipt or card image')));
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

    final res = await _tradeService.submitTrade(
      cards: cardsData,
      payoutMethod: _payoutMethod,
      payoutDetails: payoutParams,
      imagePaths: _imagePaths,
    );

    setState(() => _isSubmitting = false);

    if (!mounted) return;
    if (res['success']) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Successfully Submitted! Trade ID: ${res['tradeId']}"), backgroundColor: Colors.green));
      Navigator.pop(context); // Go back after success
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['error']), backgroundColor: Colors.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingRates) {
      return const Scaffold(backgroundColor: Color(0xFFF8FAFC), body: Center(child: CircularProgressIndicator()));
    }

    final availableBrands = _rates.map((e) => e.cardBrand).toSet().toList()..sort();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text("Sell Gift Card", style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back_ios_new, color: Color(0xFF0F172A)), onPressed: () => Navigator.pop(context)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Column(
          children: [
            // Header instructions
            const Text("List one or more cards below to submit them for review and instant payout.", style: TextStyle(color: Color(0xFF64748B), fontSize: 15)),
            const SizedBox(height: 24),

            // Payout Container
            _buildContainerNode(
              title: "1. Payout Information",
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildLabel("Select Payout Method"),
                  Row(
                    children: [
                      Expanded(child: _buildRadioTile("MOBILE_MONEY", "Mobile Money")),
                      const SizedBox(width: 8),
                      Expanded(child: _buildRadioTile("CRYPTO", "Crypto (USDT)")),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  if (_payoutMethod == "MOBILE_MONEY") ...[
                    _buildLabel("Payout Network"),
                    _buildDropdown(value: _payoutNetwork.isEmpty ? null : _payoutNetwork, items: ["MTN", "Telecel"], hint: "Select Network", onChanged: (val) => setState(() => _payoutNetwork = val!)),
                    const SizedBox(height: 12),
                    _buildLabel("Mobile Money Number"),
                    _buildTextField(controller: _payoutPhoneController, hint: "055 123 4567"),
                    const SizedBox(height: 12),
                    _buildLabel("Account Name"),
                    _buildTextField(controller: _payoutNameController, hint: "Registered name"),
                  ] else ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFE2E8F0))),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                _buildLabel("Network"),
                                _buildDropdown(value: _cryptoNetwork.isEmpty ? null : _cryptoNetwork, items: ["TRC20", "BEP20"], hint: "Select", onChanged: (val) => setState(() => _cryptoNetwork = val!)),
                              ])),
                              const SizedBox(width: 12),
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                _buildLabel("Exchange"),
                                _buildDropdown(value: _cryptoExchange.isEmpty ? null : _cryptoExchange, items: ["NOONES", "BINANCE", "OKX", "BYBIT", "KUCOIN", "OTHER"], hint: "Select", onChanged: (val) => setState(() => _cryptoExchange = val!)),
                              ])),
                            ],
                          ),
                          const SizedBox(height: 12),
                          _buildLabel("Receiving Method"),
                          _buildDropdown(value: _cryptoReceiverIdType, items: ["EXCHANGE_ID", "WALLET_ADDRESS"], hint: "Select", onChanged: (val) => setState(() => _cryptoReceiverIdType = val!)),
                          const SizedBox(height: 12),
                          _buildLabel("Account Identifier"),
                          _buildTextField(controller: _cryptoReceiverIdController, hint: "Wallet Address or ID"),
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
              title: "2. Gift Cards to Trade",
              trailing: TextButton.icon(
                onPressed: _addCard,
                icon: const Icon(Icons.add, color: Colors.white, size: 18),
                label: const Text("Add Another", style: TextStyle(color: Colors.white)),
                style: TextButton.styleFrom(backgroundColor: const Color(0xFF10B981), padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
              ),
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
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE2E8F0)), borderRadius: BorderRadius.circular(12), color: const Color(0xFFF8FAFC)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text("Card #${index + 1}", style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold)),
                            if (_cards.length > 1)
                              IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => _removeCard(card.id), padding: EdgeInsets.zero, constraints: const BoxConstraints(), splashRadius: 20),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              _buildLabel("Card Brand"),
                              _buildDropdown(
                                value: card.cardBrand.isEmpty ? null : card.cardBrand,
                                items: availableBrands,
                                hint: "Brand...",
                                onChanged: (val) => setState(() { card.cardBrand = val!; card.cardCategory = ""; _updateCardCalculation(card); }),
                              ),
                            ])),
                            const SizedBox(width: 8),
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              _buildLabel("Type"),
                              _buildDropdown(
                                value: card.cardType,
                                items: ["Physical", "E-code"],
                                hint: "Type...",
                                onChanged: (val) => setState(() { card.cardType = val!; card.cardCategory = ""; _updateCardCalculation(card); }),
                              ),
                            ])),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _buildLabel("Currency & Category"),
                        _buildDropdown(
                          value: card.cardCategory.isEmpty ? null : card.cardCategory,
                          items: availableCategories,
                          hint: card.cardBrand.isEmpty ? "Select Brand First" : "Select Category...",
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
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              _buildLabel("Exact Amount"),
                              _buildTextField(
                                controller: card.faceValueController,
                                hint: "e.g. 50",
                                keyboardType: TextInputType.number,
                                enabled: CategoryUtils.getExactCategoryAmount(card.cardCategory) == null,
                                onChanged: (_) => setState(() => _updateCardCalculation(card)),
                              ),
                              if (card.faceValueError != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text(card.faceValueError!, style: const TextStyle(color: Colors.red, fontSize: 12))),
                            ])),
                            const SizedBox(width: 8),
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              _buildLabel("Card Code/PIN"),
                              _buildTextField(controller: card.cardCodeController, hint: "Enter code"),
                            ])),
                          ],
                        ),
                        if (card.estimatedPayout != null) ...[
                          const SizedBox(height: 12),
                          Text("Estimated Payout: GH₵ ${card.estimatedPayout!.toStringAsFixed(2)}", textAlign: TextAlign.right, style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
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
                decoration: BoxDecoration(color: const Color(0xFFF0FDF4), border: Border.all(color: const Color(0xFF10B981), width: 2), borderRadius: BorderRadius.circular(12)),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text("Total Payout (${_cards.length} cards)", style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w500)),
                      Text("GH₵ ${_totalPayout.toStringAsFixed(2)}", style: const TextStyle(color: Color(0xFF2563EB), fontSize: 24, fontWeight: FontWeight.bold)),
                    ]),
                    if (_payoutMethod == "CRYPTO")
                      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                        const Text("Approx. USDT", style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w500)),
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
                  const Text("Upload images (front/back) and receipts for all cards listed above.", style: TextStyle(color: Color(0xFF64748B), fontSize: 14)),
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: _pickImages,
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        border: Border.all(color: const Color(0xFFE2E8F0), style: BorderStyle.none),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        children: [
                          const Text("📸", style: TextStyle(fontSize: 32)),
                          const SizedBox(height: 8),
                          const Text("Tap to upload proof for all cards", style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w500)),
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
                    : Text("Submit ${_cards.length} Trade${_cards.length > 1 ? 's' : ''}", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildContainerNode({required String title, required Widget child, Widget? trailing}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0)), boxShadow: const [BoxShadow(color: Color(0x0D000000), offset: Offset(0, 1), blurRadius: 2)]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
              if (trailing != null) trailing,
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      )
    );
  }

  Widget _buildLabel(String text) {
    return Padding(padding: const EdgeInsets.only(bottom: 6.0), child: Text(text, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF0F172A))));
  }

  Widget _buildDropdown({required String? value, required List<String> items, required String hint, required ValueChanged<String?> onChanged}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), border: Border.all(color: const Color(0xFFE2E8F0)), borderRadius: BorderRadius.circular(8)),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          hint: Text(hint, style: const TextStyle(color: Color(0xFF94A3B8))),
          isExpanded: true,
          icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF64748B)),
          items: items.map((i) => DropdownMenuItem(value: i, child: Text(i, overflow: TextOverflow.ellipsis))).toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _buildTextField({required TextEditingController controller, required String hint, TextInputType? keyboardType, bool enabled = true, void Function(String)? onChanged}) {
    return TextField(
      controller: controller,
      enabled: enabled,
      keyboardType: keyboardType,
      onChanged: onChanged,
      style: const TextStyle(fontSize: 14),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
        filled: true,
        fillColor: enabled ? const Color(0xFFF8FAFC) : const Color(0xFFF1F5F9),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF2563EB))),
        disabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
      ),
    );
  }

  Widget _buildRadioTile(String value, String label) {
    final isSelected = _payoutMethod == value;
    return GestureDetector(
      onTap: () => setState(() => _payoutMethod = value),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFF1F5F9) : Colors.transparent,
          border: Border.all(color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0)),
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
            Expanded(child: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500))),
          ],
        ),
      ),
    );
  }
}
