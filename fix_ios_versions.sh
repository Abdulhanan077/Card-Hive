#!/bin/bash
# Global Standardization Script (v5 - Universal Alignment)

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

echo "Aligning iOS (15.0) and macOS (11.0)..."

# 1. iOS Alignment
if [ -d "$IOS_DIR" ]; then
    PBXPROJ_IOS="$IOS_DIR/Runner.xcodeproj/project.pbxproj"
    PODFILE_IOS="$IOS_DIR/Podfile"
    sed -i '' 's/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]*;/IPHONEOS_DEPLOYMENT_TARGET = 15.0;/g' "$PBXPROJ_IOS"
    sed -i '' "s/platform :ios, '[0-9.]*'/platform :ios, '15.0'/g" "$PODFILE_IOS"
fi

# 2. macOS Alignment (Fixes the 'gal' plugin error)
if [ -d "$MACOS_DIR" ]; then
    PBXPROJ_MACOS="$MACOS_DIR/Runner.xcodeproj/project.pbxproj"
    PODFILE_MACOS="$MACOS_DIR/Podfile"
    CONFIG_MACOS="$MACOS_DIR/Runner/Configs/AppInfo.xcconfig"
    
    sed -i '' 's/MACOSX_DEPLOYMENT_TARGET = [0-9.]*;/MACOSX_DEPLOYMENT_TARGET = 11.0;/g' "$PBXPROJ_MACOS"
    [ -f "$PODFILE_MACOS" ] && sed -i '' "s/platform :osx, '[0-9.]*'/platform :osx, '11.0'/g" "$PODFILE_MACOS"
fi

# 3. Cleanup & Caches
rm -rf "$IOS_DIR/Runner.xcodeproj/project.xcworkspace/xcuserdata" 2>/dev/null
rm -rf "$IOS_DIR/Runner.xcodeproj/xcuserdata" 2>/dev/null
rm -rf ~/Library/Developer/Xcode/DerivedData/*

echo "Done! Try building macOS now: cd $PROJECT_DIR && flutter run -d macos"
