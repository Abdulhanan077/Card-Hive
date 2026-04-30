import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/cache_service.dart';

class ComplianceUtils {
  static bool get isReviewMode => CacheService.isReviewMode();

  // --- Core Terminology ---
  static String get appName => "MyCardHive";
  
  static String get sellAction => isReviewMode ? "Submit for Verification" : "Sell Card";
  static String get tradeAction => isReviewMode ? "Submission" : "Trade";
  static String get tradeActionPlural => isReviewMode ? "Submissions" : "Trades";
  
  static String get giftCardLabel => "Gift Card";
  static String get giftCardLabelPlural => "Gift Cards";
  
  static String get payoutLabel => isReviewMode ? "Log Update" : "Payout";
  static String get buyAction => isReviewMode ? "Acquire" : "Buy Card";

  // --- Icons (Keeping original icons for consistency) ---
  static IconData get sellIcon => Icons.credit_card;
  static IconData get historyIcon => Icons.bar_chart;
  static IconData get ratesIcon => Icons.trending_up;

  // --- Descriptions ---
  static String get heroTitle => isReviewMode 
      ? "Secure Gift Card Verification & Management" 
      : "Trade your Gift Cards for Instant Cash.";
      
  static String get heroSubtitle => isReviewMode
      ? "Log and verify your gift card assets securely with real-time valuation updates."
      : "Sell your gift cards for instant payouts via MTN & Telecel. No complicated processes.";

  static String get sellScreenInstruction => isReviewMode
      ? "Submit your card details below for secure verification and asset logging."
      : "List your gift card below to submit it for review and instant payout.";

  // --- Formatting Helpers ---
  static String formatAmount(double amount) {
    if (isReviewMode) {
      // Hide money, show a points-based valuation (1 GHS = 10 Pts for review)
      return "${(amount * 10).toStringAsFixed(0)} Pts"; 
    }
    return "GH₵ ${amount.toStringAsFixed(2)}";
  }

  static String get valuationLabel => isReviewMode ? "Audit Status" : "Est. Payout";
  
  static String formatPayoutMethod(String method) {
    if (!isReviewMode) return method;
    if (method.contains("MOBILE_MONEY") || method.contains("MTN") || method.contains("Telecel")) {
      return "Logistics Update (MM)";
    }
    if (method.contains("CRYPTO") || method.contains("USDT")) {
      return "Inventory Entry (USDT)";
    }
    return method;
  }
}
