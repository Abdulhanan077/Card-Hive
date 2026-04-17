import Flutter
import UIKit
import workmanager_apple

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    
    // 1. Register the Workmanager launch handler
    WorkmanagerPlugin.setPluginRegistrantCallback { registry in
        GeneratedPluginRegistrant.register(with: registry)
    }
    
    // 2. Register the periodic task with the mandatory frequency parameter
    // Using 15 minutes (900 seconds) as the frequency
    WorkmanagerPlugin.registerPeriodicTask(
        withIdentifier: "com.cardhive.notification_job_unique",
        frequency: NSNumber(value: 15 * 60)
    )
    
    // 3. Register all other plugins
    GeneratedPluginRegistrant.register(with: self)

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
