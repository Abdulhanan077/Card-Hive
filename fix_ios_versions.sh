#!/bin/bash
# Global Standardization Script (v12 - Pods Alignment)

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

echo "Applying Final Pods Alignment..."

# 1. iOS Standard (15.0)
if [ -d "$IOS_DIR" ]; then
    PBXPROJ_IOS="$IOS_DIR/Runner.xcodeproj/project.pbxproj"
    PODFILE_IOS="$IOS_DIR/Podfile"
    sed -i '' "s/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]*;/IPHONEOS_DEPLOYMENT_TARGET = 15.0;/g" "$PBXPROJ_IOS"
    sed -i '' "s/platform :ios, '[0-9.]*'/platform :ios, '15.0'/g" "$PODFILE_IOS"
fi

# 2. macOS Standard (11.0)
if [ -d "$MACOS_DIR" ]; then
    PBXPROJ_MACOS="$MACOS_DIR/Runner.xcodeproj/project.pbxproj"
    PODFILE_MACOS="$MACOS_DIR/Podfile"
    XCCONFIG_MACOS="$MACOS_DIR/Runner/Configs/AppInfo.xcconfig"
    
    sed -i '' 's/MACOSX_DEPLOYMENT_TARGET = [0-9.]*;/MACOSX_DEPLOYMENT_TARGET = 11.0;/g' "$PBXPROJ_MACOS"
    [ -f "$XCCONFIG_MACOS" ] && sed -i '' 's/MACOSX_DEPLOYMENT_TARGET = [0-9.]*/MACOSX_DEPLOYMENT_TARGET = 11.0/g' "$XCCONFIG_MACOS"
    
    # Force Pods to 11.0 in Podfile
    if [ -f "$PODFILE_MACOS" ]; then
        sed -i '' "s/platform :osx, '[0-9.]*'/platform :osx, '11.0'/g" "$PODFILE_MACOS"
        if ! grep -q "config.build_settings\['MACOSX_DEPLOYMENT_TARGET'\]" "$PODFILE_MACOS"; then
            echo "
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['MACOSX_DEPLOYMENT_TARGET'] = '11.0'
    end
  end
end" >> "$PODFILE_MACOS"
        fi
    fi
fi

rm -rf ~/Library/Developer/Xcode/DerivedData/*
echo "Pods Alignment Complete!"
