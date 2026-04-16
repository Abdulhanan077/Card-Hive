import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/models/rate.dart';
import 'package:mycardhive_mobile/services/category_utils.dart';
import 'package:mycardhive_mobile/ui/screens/login_screen.dart';

class RatesCalculator extends StatefulWidget {
  final List<Rate> rates;
  final double usdtExchangeRate;

  const RatesCalculator({
    super.key,
    required this.rates,
    required this.usdtExchangeRate,
  });

  @override
  State<RatesCalculator> createState() => _RatesCalculatorState();
}

class _RatesCalculatorState extends State<RatesCalculator> {
  String? selectedBrand;
  String selectedType = "Physical";
  String? selectedCategory;
  final TextEditingController _amountController = TextEditingController();
  double? result;
  String? amountError;

  @override
  void initState() {
    super.initState();
    _amountController.addListener(_calculateResult);
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  void _calculateResult() {
    if (selectedBrand != null && selectedCategory != null && _amountController.text.isNotEmpty) {
      final amount = double.tryParse(_amountController.text);
      if (amount == null) {
        setState(() {
          amountError = "Invalid amount";
          result = null;
        });
        return;
      }

      final error = CategoryUtils.validateCategoryAmount(amount, selectedCategory!);
      if (error.isNotEmpty) {
        setState(() {
          amountError = error;
          result = null;
        });
      } else {
        final rateRecord = widget.rates.firstWhere(
          (r) =>
              r.cardBrand == selectedBrand &&
              r.cardCountry == selectedCategory &&
              (r.cardType == selectedType || (r.cardType.isEmpty && selectedType == "Physical")),
          orElse: () => Rate(id: 0, cardBrand: "", cardCountry: "", cardType: "", rate: 0),
        );

        if (rateRecord.id != 0) {
          setState(() {
            amountError = null;
            result = amount * rateRecord.displayRate;
          });
        } else {
          setState(() {
            result = null;
          });
        }
      }
    } else {
      setState(() {
        amountError = null;
        result = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final brands = widget.rates.map((r) => r.cardBrand).toSet().toList()..sort();
    final categories = widget.rates
        .where((r) =>
            r.cardBrand == selectedBrand &&
            (r.cardType == selectedType || (r.cardType.isEmpty && selectedType == "Physical")))
        .map((r) => r.cardCountry)
        .toSet()
        .toList()
      ..sort(CategoryUtils.sortCategories);

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.dividerColor),
        boxShadow: isDark ? [] : const [
          BoxShadow(
            color: Color(0x0D000000),
            blurRadius: 2,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(theme, isDark),
          const SizedBox(height: 20),
          _buildLabel("Select Gift Card Brand", theme, isDark),
          _buildDropdown(
            value: selectedBrand,
            items: brands,
            hint: "Choose Brand...",
            theme: theme,
            isDark: isDark,
            onChanged: (val) {
              setState(() {
                selectedBrand = val;
                selectedCategory = null;
                _amountController.clear();
              });
            },
          ),
          const SizedBox(height: 15),
          _buildLabel("Card Type", theme, isDark),
          _buildDropdown(
            value: selectedType,
            items: ["Physical", "E-code"],
            theme: theme,
            isDark: isDark,
            onChanged: (val) {
              setState(() {
                selectedType = val!;
                selectedCategory = null;
                _amountController.clear();
              });
            },
          ),
          const SizedBox(height: 15),
          _buildLabel("Category / Country", theme, isDark),
          _buildDropdown(
            value: selectedCategory,
            items: categories,
            hint: selectedBrand != null ? "Choose category..." : "Select Brand First",
            disabled: selectedBrand == null,
            theme: theme,
            isDark: isDark,
            onChanged: (val) {
              setState(() {
                selectedCategory = val;
                final exact = CategoryUtils.getExactCategoryAmount(val!);
                if (exact != null) {
                  _amountController.text = exact.toString();
                } else {
                  _amountController.clear();
                }
              });
            },
          ),
          const SizedBox(height: 15),
          _buildLabel("Amount (USD/GBP/EUR)", theme, isDark),
          _buildAmountField(theme, isDark),
          if (amountError != null)
            Padding(
              padding: const EdgeInsets.only(top: 8.0),
              child: Text(amountError!, style: const TextStyle(color: Colors.red, fontSize: 12)),
            ),
          const SizedBox(height: 25),
          _buildResultArea(theme, isDark),
        ],
      ),
    );
  }

  Widget _buildHeader(ThemeData theme, bool isDark) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: const Color(0xFF2563EB),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.calculate_rounded, color: Colors.white, size: 24),
        ),
        const SizedBox(width: 12),
        Text(
          "Rate Calculator",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface),
        ),
      ],
    );
  }

  Widget _buildLabel(String text, ThemeData theme, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: theme.colorScheme.onSurface.withOpacity(0.7),
        ),
      ),
    );
  }

  Widget _buildDropdown({
    required String? value,
    required List<String> items,
    String? hint,
    bool disabled = false,
    required ThemeData theme,
    required bool isDark,
    required void Function(String?) onChanged,
  }) {
    return InkWell(
      onTap: disabled ? null : () {
        _showBottomSheetPicker(
          items: items, 
          title: hint ?? "Select Option", 
          theme: theme,
          isDark: isDark,
          onSelected: onChanged
        );
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: disabled 
            ? (isDark ? Colors.white.withOpacity(0.05) : Colors.grey[100]) 
            : (isDark ? Colors.white.withOpacity(0.1) : Colors.grey[50]),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: theme.dividerColor, width: 2),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                value ?? hint ?? "",
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: value == null ? FontWeight.normal : FontWeight.w600,
                  color: value == null ? theme.colorScheme.onSurface.withOpacity(0.5) : theme.colorScheme.onSurface,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Icon(Icons.keyboard_arrow_down_rounded, color: theme.colorScheme.onSurface.withOpacity(0.5)),
          ],
        ),
      ),
    );
  }

  void _showBottomSheetPicker({
    required List<String> items,
    required String title,
    required ThemeData theme,
    required bool isDark,
    required void Function(String?) onSelected,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: theme.cardColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return _BottomSheetPickerContent(
          items: items,
          title: title,
          onSelected: (val) {
            onSelected(val);
            Navigator.pop(context);
          },
        );
      },
    );
  }

  Widget _buildAmountField(ThemeData theme, bool isDark) {
    final bool isExact = selectedCategory != null && CategoryUtils.getExactCategoryAmount(selectedCategory!) != null;

    return TextFormField(
      controller: _amountController,
      keyboardType: TextInputType.number,
      readOnly: isExact,
      style: TextStyle(color: theme.colorScheme.onSurface),
      decoration: InputDecoration(
        hintText: "Enter face value amount",
        hintStyle: TextStyle(color: theme.colorScheme.onSurface.withOpacity(0.4)),
        filled: true,
        fillColor: isExact 
          ? (isDark ? Colors.white.withOpacity(0.05) : Colors.grey[200]) 
          : (isDark ? Colors.white.withOpacity(0.1) : Colors.grey[50]),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: theme.dividerColor, width: 2),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: theme.dividerColor, width: 2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2),
        ),
      ),
    );
  }

  Widget _buildResultArea(ThemeData theme, bool isDark) {
    return Column(
      children: [
        Text(
          "ESTIMATED PAYOUT",
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface.withOpacity(0.5)),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            const Text(
              "GHS ",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
            ),
            Text(
              result != null ? result!.toStringAsFixed(2) : "0.00",
              style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: Color(0xFF2563EB)),
            ),
          ],
        ),
        if (result != null && widget.usdtExchangeRate > 0)
          Padding(
            padding: const EdgeInsets.only(top: 8.0),
            child: Text(
              "≈ ${(result! / widget.usdtExchangeRate).toStringAsFixed(2)} USDT",
              style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const LoginScreen()),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text("Sell Now", style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                SizedBox(width: 8),
                Icon(Icons.arrow_forward_rounded, size: 20),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _BottomSheetPickerContent extends StatefulWidget {
  final List<String> items;
  final String title;
  final void Function(String) onSelected;

  const _BottomSheetPickerContent({
    required this.items,
    required this.title,
    required this.onSelected,
  });

  @override
  State<_BottomSheetPickerContent> createState() => _BottomSheetPickerContentState();
}

class _BottomSheetPickerContentState extends State<_BottomSheetPickerContent> {
  String _searchQuery = "";

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final filtered = widget.items
        .where((e) => e.toLowerCase().contains(_searchQuery.toLowerCase()))
        .toList();

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        top: 20,
        left: 20,
        right: 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: theme.dividerColor,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          Text(widget.title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: theme.colorScheme.onSurface)),
          const SizedBox(height: 15),
          if (widget.items.length > 5)
            TextField(
              style: TextStyle(color: theme.colorScheme.onSurface),
              decoration: InputDecoration(
                hintText: "Search...",
                hintStyle: TextStyle(color: theme.colorScheme.onSurface.withOpacity(0.4)),
                prefixIcon: Icon(Icons.search, color: theme.colorScheme.onSurface.withOpacity(0.4)),
                filled: true,
                fillColor: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[100],
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
              onChanged: (val) {
                setState(() {
                  _searchQuery = val;
                });
              },
            ),
          if (widget.items.length > 5) const SizedBox(height: 10),
          ConstrainedBox(
            constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.5),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: filtered.length,
              itemBuilder: (context, index) {
                final item = filtered[index];
                return ListTile(
                  title: Text(item, style: TextStyle(fontWeight: FontWeight.w500, color: theme.colorScheme.onSurface)),
                  onTap: () => widget.onSelected(item),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                );
              },
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}
