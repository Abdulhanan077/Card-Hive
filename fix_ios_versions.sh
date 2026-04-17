#!/bin/bash
# Global Standardization Script (v10 - Ultimate Stability)

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

echo "Applying Ultimate Stability Alignment..."

# 1. iOS Standard (15.0)
if [ -d "$IOS_DIR" ]; then
    PBXPROJ_IOS="$IOS_DIR/Runner.xcodeproj/project.pbxproj"
    PODFILE_IOS="$IOS_DIR/Podfile"
    sed -i '' "s/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]*;/IPHONEOS_DEPLOYMENT_TARGET = 15.0;/g" "$PBXPROJ_IOS"
    sed -i '' "s/platform :ios, '[0-9.]*'/platform :ios, '15.0'/g" "$PODFILE_IOS"
fi

# 2. macOS Standard (11.0) - Fixes 'gal' and other plugins
if [ -d "$MACOS_DIR" ]; then
    PBXPROJ_MACOS="$MACOS_DIR/Runner.xcodeproj/project.pbxproj"
    PODFILE_MACOS="$MACOS_DIR/Podfile"
    sed -i '' 's/MACOSX_DEPLOYMENT_TARGET = [0-9.]*;/MACOSX_DEPLOYMENT_TARGET = 11.0;/g' "$PBXPROJ_MACOS"
    [ -f "$PODFILE_MACOS" ] && sed -i '' "s/platform :osx, '[0-9.]*'/platform :osx, '11.0'/g" "$PODFILE_MACOS"
fi

# 3. Comprehensive CocoaPods Linking
[ -f "$IOS_DIR/Flutter/Debug.xcconfig" ] && echo '#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.debug.xcconfig"' >> "$IOS_DIR/Flutter/Debug.xcconfig"
[ -f "$IOS_DIR/Flutter/Release.xcconfig" ] && echo '#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.release.xcconfig"' >> "$IOS_DIR/Flutter/Release.xcconfig"
[ -f "$IOS_DIR/Flutter/Release.xcconfig" ] && echo '#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.profile.xcconfig"' >> "$IOS_DIR/Flutter/Release.xcconfig"

# 4. Burn cached UI data
rm -rf "$IOS_DIR/Runner.xcodeproj/project.xcworkspace/xcuserdata"
rm -rf "$IOS_DIR/Runner.xcodeproj/xcuserdata"
rm -rf ~/Library/Developer/Xcode/DerivedData/*

echo "Alignment Complete. Launching Stability Pivot..."
