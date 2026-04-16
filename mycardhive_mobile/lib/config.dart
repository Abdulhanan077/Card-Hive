class AppConfig {
  // --- 🔧 TEST MODE (Use your PC IP here) ---
  static const String testUrl = 'http://192.168.101.52:3000/api';
  
  // --- 🌐 LIVE MODE (Use your website URL here) ---
  static const String liveUrl = 'https://mycardhive.com/api';

  // --- 🚀 TOGGLE THIS LINE ---
  // Change this to 'liveUrl' when you are ready to publish the app!
  static const String baseUrl = liveUrl; 
}
