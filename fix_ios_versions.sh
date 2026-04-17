#!/bin/bash
# Global Standardization Script (v13 - Sandbox Bypass)

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

echo "Applying Sandbox Bypass & Platform Alignment..."

# 1. iOS Standard (15.0)
if [ -d "$IOS_DIR" ]; then
    PBXPROJ_IOS="$IOS_DIR/Runner.xcodeproj/project.pbxproj"
    PODFILE_IOS="$IOS_DIR/Podfile"
    sed -i '' "s/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]*;/IPHONEOS_DEPLOYMENT_TARGET = 15.0;/g" "$PBXPROJ_IOS"
    sed -i '' "s/platform :ios, '[0-9.]*'/platform :ios, '15.0'/g" "$PODFILE_IOS"
fi

# 2. macOS Standard (11.0) + Sandbox Disable
if [ -d "$MACOS_DIR" ]; then
    PBXPROJ_MACOS="$MACOS_DIR/Runner.xcodeproj/project.pbxproj"
    XCCONFIG_MACOS="$MACOS_DIR/Runner/Configs/AppInfo.xcconfig"
    DEBUG_ENT="$MACOS_DIR/Runner/DebugProfile.entitlements"
    RELEASE_ENT="$MACOS_DIR/Runner/Release.entitlements"
    
    # Disable Sandbox in Entitlements (fixes networking and keychain errors instantly)
    [ -f "$DEBUG_ENT" ] && sed -i '' "s/com.apple.security.app-sandbox<\/key>.*<true\/>/com.apple.security.app-sandbox<\/key><false\/>/g" "$DEBUG_ENT"
    [ -f "$RELEASE_ENT" ] && sed -i '' "s/com.apple.security.app-sandbox<\/key>.*<true\/>/com.apple.security.app-sandbox<\/key><false\/>/g" "$RELEASE_ENT"
    
    # Force versions
    sed -i '' 's/MACOSX_DEPLOYMENT_TARGET = [0-9.]*;/MACOSX_DEPLOYMENT_TARGET = 11.0;/g' "$PBXPROJ_MACOS"
    [ -f "$XCCONFIG_MACOS" ] && sed -i '' 's/MACOSX_DEPLOYMENT_TARGET = [0-9.]*/MACOSX_DEPLOYMENT_TARGET = 11.0/g' "$XCCONFIG_MACOS"
fi

rm -rf ~/Library/Developer/Xcode/DerivedData/*
echo "Sandbox Bypass Complete!"
