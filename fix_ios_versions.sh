#!/bin/bash
# Global Standardization Script for iOS 15.0

PROJECT_DIR="mycardhive_mobile"
IOS_DIR="$PROJECT_DIR/ios"
PBXPROJ="$IOS_DIR/Runner.xcodeproj/project.pbxproj"
PODFILE="$IOS_DIR/Podfile"

echo "Applying Global Version Standardization (iOS 15.0)..."

# 1. Update project.pbxproj
sed -i '' 's/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]*;/IPHONEOS_DEPLOYMENT_TARGET = 15.0;/g' "$PBXPROJ"

# 2. Update Podfile platform
sed -i '' "s/platform :ios, '[0-9.]*'/platform :ios, '15.0'/g" "$PODFILE"

# 3. Update Podfile post_install
# We'll use a safer approach to ensure the target loop exists
if ! grep -q "IPHONEOS_DEPLOYMENT_TARGET" "$PODFILE"; then
    echo "Adding post_install hook to Podfile..."
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

# 4. Update xcconfigs
echo '#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.debug.xcconfig"' >> "$IOS_DIR/Flutter/Debug.xcconfig"
echo '#include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.release.xcconfig"' >> "$IOS_DIR/Flutter/Release.xcconfig"

echo "Done! Please run: cd $PROJECT_DIR && flutter pub get && cd ios && pod install --repo-update && cd .."
