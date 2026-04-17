#!/bin/bash
# Global Standardization Script (v9 - Restoration)

if [ -d "mycardhive_mobile" ]; then
    PROJECT_DIR="mycardhive_mobile"
elif [ -d "ios" ]; then
    PROJECT_DIR="."
else
    echo "Error: Could not find Flutter project directory."
    exit 1
fi

IOS_DIR="$PROJECT_DIR/ios"
MACOS_DIR="$PROJECT_DIR/macos"
TARGET_VER="15.0"

echo "Restoring Standard iOS (15.0) and macOS (11.0) Identity..."

# 1. iOS Alignment (Standard)
if [ -d "$IOS_DIR" ]; then
    PBXPROJ_IOS="$IOS_DIR/Runner.xcodeproj/project.pbxproj"
    PODFILE_IOS="$IOS_DIR/Podfile"
    
    # Restore standard SDKROOT and Platforms
    sed -i '' "s/SDKROOT = [a-zA-Z0-9.]*;/SDKROOT = iphoneos;/g" "$PBXPROJ_IOS"
    sed -i '' 's/SUPPORTED_PLATFORMS = [a-zA-Z0-9"]*;/SUPPORTED_PLATFORMS = "iphonesimulator iphoneos";/g' "$PBXPROJ_IOS"
    
    # Set targets
    sed -i '' "s/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]*;/IPHONEOS_DEPLOYMENT_TARGET = $TARGET_VER;/g" "$PBXPROJ_IOS"
    sed -i '' "s/platform :ios, '[0-9.]*'/platform :ios, '$TARGET_VER'/g" "$PODFILE_IOS"
fi

# 2. Link Pods for all configurations
[ -f "$IOS_DIR/Flutter/Debug.xcconfig" ] && echo '#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.debug.xcconfig"' >> "$IOS_DIR/Flutter/Debug.xcconfig"
[ -f "$IOS_DIR/Flutter/Release.xcconfig" ] && echo '#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.release.xcconfig"' >> "$IOS_DIR/Flutter/Release.xcconfig"
[ -f "$IOS_DIR/Flutter/Release.xcconfig" ] && echo '#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.profile.xcconfig"' >> "$IOS_DIR/Flutter/Release.xcconfig"

# 3. Purge xcuserdata & Hidden Files
rm -rf "$IOS_DIR/Runner.xcodeproj/project.xcworkspace/xcuserdata"
rm -rf "$IOS_DIR/Runner.xcodeproj/xcuserdata"
rm -rf ~/Library/Developer/Xcode/DerivedData/*

echo "Restoration Done! Final build:"
echo "cd $PROJECT_DIR && flutter pub get && cd ios && pod install && cd .. && flutter run"
