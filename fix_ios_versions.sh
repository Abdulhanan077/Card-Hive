#!/bin/bash
# Global Standardization Script (v14 - Absolute Sandbox Killer)

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

echo "Killing Sandbox & Force-Syncing Platforms..."

# 1. iOS Standard (15.0)
if [ -d "$IOS_DIR" ]; then
    PBXPROJ_IOS="$IOS_DIR/Runner.xcodeproj/project.pbxproj"
    sed -i '' "s/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]*;/IPHONEOS_DEPLOYMENT_TARGET = 15.0;/g" "$PBXPROJ_IOS"
fi

# 2. macOS - The Absolute Sandbox Killer
if [ -d "$MACOS_DIR" ]; then
    PBXPROJ_MACOS="$MACOS_DIR/Runner.xcodeproj/project.pbxproj"
    XCCONFIG_MACOS="$MACOS_DIR/Runner/Configs/AppInfo.xcconfig"
    DEBUG_ENT="$MACOS_DIR/Runner/DebugProfile.entitlements"
    RELEASE_ENT="$MACOS_DIR/Runner/Release.entitlements"
    
    # Force 11.0 everywhere
    find macos -type f -name "*.pbxproj" -exec sed -i '' 's/MACOSX_DEPLOYMENT_TARGET = [0-9.]*/MACOSX_DEPLOYMENT_TARGET = 11.0/g' {} +
    find macos -type f -name "*.xcconfig" -exec sed -i '' 's/MACOSX_DEPLOYMENT_TARGET = [0-9.]*/MACOSX_DEPLOYMENT_TARGET = 11.0/g' {} +
    
    # Delete Sandbox reference entirely (This is the most stable way to disable it)
    [ -f "$DEBUG_ENT" ] && printf '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n\t<key>com.apple.security.app-sandbox</key>\n\t<false/>\n\t<key>com.apple.security.cs.allow-jit</key>\n\t<true/>\n</dict>\n</plist>' > "$DEBUG_ENT"
    [ -f "$RELEASE_ENT" ] && printf '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n\t<key>com.apple.security.app-sandbox</key>\n\t<false/>\n</dict>\n</plist>' > "$RELEASE_ENT"
fi

rm -rf ~/Library/Developer/Xcode/DerivedData/*
echo "Sandbox Killed. Build Ready!"
