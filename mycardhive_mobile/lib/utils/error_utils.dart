import 'dart:io';

class ErrorUtils {
  static String getFriendlyErrorMessage(dynamic error) {
    final String errorStr = error.toString().toLowerCase();

    if (error is SocketException || errorStr.contains('socketexception') || errorStr.contains('failed host lookup')) {
      return 'You are currently offline. Please check your internet connection and try again.';
    }
    
    if (errorStr.contains('timeout') || errorStr.contains('handshake')) {
      return 'Connection timed out. Please try again.';
    }

    if (errorStr.contains('unauthorized') || errorStr.contains('401')) {
      return 'Session expired. Please login again.';
    }

    if (errorStr.contains('404')) {
      return 'Resource not found. Please contact support.';
    }

    if (errorStr.contains('500') || errorStr.contains('502') || errorStr.contains('503')) {
      return 'Server is temporarily unavailable. Please try again later.';
    }

    // Default friendly message if we don't recognize the error
    return 'Something went wrong. Please try again later.';
  }
}
