#!/bin/bash
# Global Standardization Script (v4 - SDK Breakthrough)

if [ -d "mycardhive_mobile" ]; then
    PROJECT_DIR="mycardhive_mobile"
elif [ -d "ios" ]; then
    PROJECT_DIR="."
else
    echo "Error: Could not find Flutter project directory."
    exit 1
fi

IOS_DIR="$PROJECT_DIR/ios"
PBXPROJ="$IOS_DIR/Runner.xcodeproj/project.pbxproj"
PODFILE="$IOS_DIR/Podfile"

echo "Applying SDK Breakthrough Fix to $PROJECT_DIR..."

# 1. Deployment Target Lock (Force 15.0)
sed -i '' 's/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]*;/IPHONEOS_DEPLOYMENT_TARGET = 15.0;/g' "$PBXPROJ"
sed -i '' "s/platform :ios, '[0-9.]*'/platform :ios, '15.0'/g" "$PODFILE"

# 2. Force SDKROOT and SUPPORTED_PLATFORMS
# This tells Xcode: "Use whatever iPhoneOS is standard, and we only support Simulator for now"
# This often bypasses the 'Any iOS Device' eligibility block
sed -i '' 's/SDKROOT = iphoneos;/SDKROOT = iphoneos;/g' "$PBXPROJ"
# Explicitly add SUPPORTED_PLATFORMS override if missing
if ! grep -q "SUPPORTED_PLATFORMS = \"iphonesimulator iphoneos\"" "$PBXPROJ"; then
    sed -i '' '/SDKROOT = iphoneos;/a \
				SUPPORTED_PLATFORMS = "iphonesimulator iphoneos";' "$PBXPROJ"
fi

# 3. Comprehensive XCConfig Linking
DEBUG_LINK='#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.debug.xcconfig"'
RELEASE_LINK='#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.release.xcconfig"'
PROFILE_LINK='#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.profile.xcconfig"'

[ -f "$IOS_DIR/Flutter/Debug.xcconfig" ] && ! grep -q "Pods-Runner.debug" "$IOS_DIR/Flutter/Debug.xcconfig" && echo "$DEBUG_LINK" >> "$IOS_DIR/Flutter/Debug.xcconfig"
[ -f "$IOS_DIR/Flutter/Release.xcconfig" ] && ! grep -q "Pods-Runner.release" "$IOS_DIR/Flutter/Release.xcconfig" && echo "$RELEASE_LINK" >> "$IOS_DIR/Flutter/Release.xcconfig"
[ -f "$IOS_DIR/Flutter/Release.xcconfig" ] && ! grep -q "Pods-Runner.profile" "$IOS_DIR/Flutter/Release.xcconfig" && echo "$PROFILE_LINK" >> "$IOS_DIR/Flutter/Release.xcconfig"

# 4. Cleanup Ghost States
echo "Purging Ghost States..."
rm -rf "$IOS_DIR/Runner.xcodeproj/project.xcworkspace/xcuserdata"
rm -rf "$IOS_DIR/Runner.xcodeproj/xcuserdata"
rm -rf ~/Library/Developer/Xcode/DerivedData/*

echo "Done! Run: cd $PROJECT_DIR && flutter pub get && cd ios && pod install && cd .."
