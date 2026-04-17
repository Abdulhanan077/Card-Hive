#!/bin/bash
# Global Standardization Script (v7 - The Deep-Root Fix)

if [ -d "mycardhive_mobile" ]; then
    PROJECT_DIR="mycardhive_mobile"
elif [ -d "ios" ]; then
    PROJECT_DIR="."
else
    echo "Error: Could not find Flutter project directory."
    exit 1
fi

IOS_DIR="$PROJECT_DIR/ios"
TARGET_VER="26.2"

echo "Applying Deep-Root Fix for SDK $TARGET_VER..."

# 1. Deployment Target Alignment
PBXPROJ_IOS="$IOS_DIR/Runner.xcodeproj/project.pbxproj"
PODFILE_IOS="$IOS_DIR/Podfile"

sed -i '' "s/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]*;/IPHONEOS_DEPLOYMENT_TARGET = $TARGET_VER;/g" "$PBXPROJ_IOS"
sed -i '' "s/platform :ios, '[0-9.]*'/platform :ios, '$TARGET_VER'/g" "$PODFILE_IOS"
sed -i '' "s/IPHONEOS_DEPLOYMENT_TARGET'] = '[0-9.]*'/IPHONEOS_DEPLOYMENT_TARGET'] = '$TARGET_VER'/g" "$PODFILE_IOS"

# 2. Hard-Link the SDK (This is the breakthrough)
# Changing SDKROOT from generic 'iphoneos' to the specific server name 'iphoneos26.2'
sed -i '' "s/SDKROOT = iphoneos;/SDKROOT = iphoneos$TARGET_VER;/g" "$PBXPROJ_IOS"

# 3. Purge xcuserdata which might hold the old 'Any iOS Device' reference
rm -rf "$IOS_DIR/Runner.xcodeproj/project.xcworkspace/xcuserdata"
rm -rf "$IOS_DIR/Runner.xcodeproj/xcuserdata"
rm -rf ~/Library/Developer/Xcode/DerivedData/*

echo "Done! Final build on Mac:"
echo "cd $PROJECT_DIR && flutter pub get && cd ios && pod install && cd .. && flutter run"
