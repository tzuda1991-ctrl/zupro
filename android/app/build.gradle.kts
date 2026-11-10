plugins { id("com.android.application"); id("org.jetbrains.kotlin.android"); id("com.google.gms.google-services") }
android {
 namespace = "com.star777.app"
 compileSdk = 35
 defaultConfig { applicationId = "com.star777.app"; minSdk = 24; targetSdk = 35; versionCode = 2; versionName = "0.2.0" }
 buildTypes { release { isMinifyEnabled = false } }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget = "17" }
}
dependencies { implementation("com.google.firebase:firebase-messaging:24.1.2") }
