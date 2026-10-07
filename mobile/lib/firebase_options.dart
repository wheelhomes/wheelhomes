import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        return web;
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyBPqtmYmLusY54OZ0In1FxmYegnSI8EHhA',
    appId: '1:588219861231:web:7c06590c71b7992646731a',
    messagingSenderId: '588219861231',
    projectId: 'wheelhomes',
    authDomain: 'wheelhomes.firebaseapp.com',
    storageBucket: 'wheelhomes.firebasestorage.app',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBPqtmYmLusY54OZ0In1FxmYegnSI8EHhA',
    appId: '1:588219861231:android:7c06590c71b7992646731a',
    messagingSenderId: '588219861231',
    projectId: 'wheelhomes',
    storageBucket: 'wheelhomes.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyBPqtmYmLusY54OZ0In1FxmYegnSI8EHhA',
    appId: '1:588219861231:ios:7c06590c71b7992646731a',
    messagingSenderId: '588219861231',
    projectId: 'wheelhomes',
    storageBucket: 'wheelhomes.firebasestorage.app',
    iosBundleId: 'com.wheelhomes.wheelhomesMobile',
  );
}
