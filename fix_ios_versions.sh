#!/bin/bash
# Global Standardization Script (v6 - The 26.2 Alignment)

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
TARGET_VER="26.2" # Align with MacinCloud SDK

echo "Aligning project with MacinCloud SDK $TARGET_VER..."

# 1. iOS Alignment (Forcing SDK version to bypass eligibility block)
if [ -d "$IOS_DIR" ]; then
    PBXPROJ_IOS="$IOS_DIR/Runner.xcodeproj/project.pbxproj"
    PODFILE_IOS="$IOS_DIR/Podfile"
    sed -i '' "s/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]*;/IPHONEOS_DEPLOYMENT_TARGET = $TARGET_VER;/g" "$PBXPROJ_IOS"
    sed -i '' "s/platform :ios, '[0-9.]*'/platform :ios, '$TARGET_VER'/g" "$PODFILE_IOS"
    
    # Update Podfile loop to target 26.2
    sed -i '' "s/IPHONEOS_DEPLOYMENT_TARGET'] = '[0-9.]*'/IPHONEOS_DEPLOYMENT_TARGET'] = '$TARGET_VER'/g" "$PODFILE_IOS"
fi

# 2. macOS Alignment
if [ -d "$MACOS_DIR" ]; then
    PBXPROJ_MACOS="$MACOS_DIR/Runner.xcodeproj/project.pbxproj"
    sed -i '' 's/MACOSX_DEPLOYMENT_TARGET = [0-9.]*;/MACOSX_DEPLOYMENT_TARGET = 11.0;/g' "$PBXPROJ_MACOS"
fi

# 3. Link Pods for all configurations
[ -f "$IOS_DIR/Flutter/Debug.xcconfig" ] && echo '#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.debug.xcconfig"' >> "$IOS_DIR/Flutter/Debug.xcconfig"
[ -f "$IOS_DIR/Flutter/Release.xcconfig" ] && echo '#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.release.xcconfig"' >> "$IOS_DIR/Flutter/Release.xcconfig"
[ -f "$IOS_DIR/Flutter/Release.xcconfig" ] && echo '#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.profile.xcconfig"' >> "$IOS_DIR/Flutter/Release.xcconfig"

echo "Done! Run: cd $PROJECT_DIR && flutter pub get && cd ios && pod install && cd .."
