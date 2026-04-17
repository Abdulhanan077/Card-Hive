#!/bin/bash
# Global Standardization Script (v8 - Simulator Bypass)

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

echo "Applying Simulator-Only Bypass for SDK $TARGET_VER..."

# 1. Strip Real-Device Platforms and Lock to Simulator SDK
PBXPROJ_IOS="$IOS_DIR/Runner.xcodeproj/project.pbxproj"
PODFILE_IOS="$IOS_DIR/Podfile"

# Replace iphoneos with iphonesimulator and set explicit SDK
sed -i '' "s/SDKROOT = iphoneos;/SDKROOT = iphonesimulator$TARGET_VER;/g" "$PBXPROJ_IOS"
sed -i '' "s/SUPPORTED_PLATFORMS = \"iphonesimulator iphoneos\";/SUPPORTED_PLATFORMS = iphonesimulator;/g" "$PBXPROJ_IOS"
sed -i '' "s/SUPPORTED_PLATFORMS = iphoneos;/SUPPORTED_PLATFORMS = iphonesimulator;/g" "$PBXPROJ_IOS"

# Force version in Podfile
sed -i '' "s/platform :ios, '[0-9.]*'/platform :ios, '$TARGET_VER'/g" "$PODFILE_IOS"

# 2. Comprehensive XCConfig Alignment
echo "IPHONEOS_DEPLOYMENT_TARGET = $TARGET_VER" >> "$IOS_DIR/Flutter/Debug.xcconfig"
echo "SDKROOT = iphonesimulator$TARGET_VER" >> "$IOS_DIR/Flutter/Debug.xcconfig"
echo "SUPPORTED_PLATFORMS = iphonesimulator" >> "$IOS_DIR/Flutter/Debug.xcconfig"

# 3. Purge xcuserdata & Hidden Files
rm -rf "$IOS_DIR/Runner.xcodeproj/project.xcworkspace/xcuserdata"
rm -rf "$IOS_DIR/Runner.xcodeproj/xcuserdata"
rm -rf ~/Library/Developer/Xcode/DerivedData/*

echo "Done! Final build command (Generic Simulator):"
echo "xcodebuild -workspace ios/Runner.xcworkspace -scheme Runner -configuration Debug -sdk iphonesimulator$TARGET_VER -destination 'generic/platform=iOS Simulator' build"
