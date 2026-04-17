#!/bin/bash
# Global Standardization Script (v11 - macOS Lock)

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

echo "Locking iOS (15.0) and macOS (11.0)..."

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
    
    # Update pbxproj
    sed -i '' 's/MACOSX_DEPLOYMENT_TARGET = [0-9.]*;/MACOSX_DEPLOYMENT_TARGET = 11.0;/g' "$PBXPROJ_MACOS"
    
    # Update Podfile
    [ -f "$PODFILE_MACOS" ] && sed -i '' "s/platform :osx, '[0-9.]*'/platform :osx, '11.0'/g" "$PODFILE_MACOS"
    
    # Update AppInfo.xcconfig (Crucial for Flutter macOS)
    if [ -f "$XCCONFIG_MACOS" ]; then
        if grep -q "MACOSX_DEPLOYMENT_TARGET" "$XCCONFIG_MACOS"; then
            sed -i '' 's/MACOSX_DEPLOYMENT_TARGET = [0-9.]*/MACOSX_DEPLOYMENT_TARGET = 11.0/g' "$XCCONFIG_MACOS"
        else
            echo "MACOSX_DEPLOYMENT_TARGET = 11.0" >> "$XCCONFIG_MACOS"
        fi
    fi
fi

# 3. Purge Caches
rm -rf ~/Library/Developer/Xcode/DerivedData/*

echo "Alignment Complete!"
