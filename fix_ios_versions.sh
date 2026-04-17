#!/bin/bash
# Global Standardization Script (v3 - Maximum Hardening)

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

echo "Applying Maximum Hardening to $PROJECT_DIR..."

# 1. Deployment Target Lock
sed -i '' 's/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]*;/IPHONEOS_DEPLOYMENT_TARGET = 15.0;/g' "$PBXPROJ"
sed -i '' "s/platform :ios, '[0-9.]*'/platform :ios, '15.0'/g" "$PODFILE"

# 2. Post-install script consistency
if ! grep -q "IPHONEOS_DEPLOYMENT_TARGET" "$PODFILE"; then
    echo "Adding post_install hook..."
    echo "
post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
    end
  end
end" >> "$PODFILE"
fi

# 3. Comprehensive XCConfig Linking (Resolves CocoaPods Warnings)
# We ensure ALL Pods configs are covered
DEBUG_LINK='#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.debug.xcconfig"'
RELEASE_LINK='#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.release.xcconfig"'
PROFILE_LINK='#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.profile.xcconfig"'

[ -f "$IOS_DIR/Flutter/Debug.xcconfig" ] && ! grep -q "Pods-Runner.debug" "$IOS_DIR/Flutter/Debug.xcconfig" && echo "$DEBUG_LINK" >> "$IOS_DIR/Flutter/Debug.xcconfig"
[ -f "$IOS_DIR/Flutter/Release.xcconfig" ] && ! grep -q "Pods-Runner.release" "$IOS_DIR/Flutter/Release.xcconfig" && echo "$RELEASE_LINK" >> "$IOS_DIR/Flutter/Release.xcconfig"
# Also add Profile to Release as Flutter uses Release.xcconfig for Profile builds
[ -f "$IOS_DIR/Flutter/Release.xcconfig" ] && ! grep -q "Pods-Runner.profile" "$IOS_DIR/Flutter/Release.xcconfig" && echo "$PROFILE_LINK" >> "$IOS_DIR/Flutter/Release.xcconfig"

# 4. Cleanup
echo "Clearing Cache & xcuserdata..."
rm -rf "$IOS_DIR/Runner.xcodeproj/project.xcworkspace/xcuserdata"
rm -rf "$IOS_DIR/Runner.xcodeproj/xcuserdata"
rm -rf ~/Library/Developer/Xcode/DerivedData/*

echo "Done! Run: cd $PROJECT_DIR && flutter pub get && cd ios && pod install && cd .."
