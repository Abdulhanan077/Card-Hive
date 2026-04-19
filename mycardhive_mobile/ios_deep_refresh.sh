#!/bin/bash
# Card-Hive iOS Deep Refresh Script
# This script forces a full regeneration of Flutter engines and CocoaPods for iOS 26+ compatibility.

echo "🚀 Starting Deep Refresh for Card-Hive iOS..."

if [ -d "mycardhive_mobile" ]; then
    cd mycardhive_mobile
fi

# 1. Update your dependencies to the absolute latest versions
echo "📦 Upgrading pub dependencies..."
flutter pub upgrade --major-versions

# 2. Download missing iOS tools and engines for the new OS
echo "🛠️ Precaching iOS engines..."
flutter precache --ios

# 3. Deep clean the build cache
echo "🧹 Cleaning Flutter build cache..."
flutter clean
flutter pub get

# 4. Clean and rebuild the native iOS side
if [ -d "ios" ]; then
    echo "🍎 Resetting CocoaPods..."
    cd ios
    rm -rf Pods
    rm -f Podfile.lock
    
    # Force repo update to ensure latest native support for iOS 26
    pod install --repo-update
    cd ..
fi

echo "✅ Deep Refresh Complete! You can now run the app on the simulators."
echo "💡 Tip: If icons still show as [?], it is a confirmed Impeller bug on specific simulator versions."
