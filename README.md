# ZUPRO AI — Android Offline AI Starter

Android/Kotlin starter for a 6 GB RAM Android phone.

## Included
- Native Android chat screen
- GGUF model picker and local import
- No network permission; model files remain on device

## Important limitation
**Offline inference is not implemented yet.** The OfflineEngine class is a placeholder. The next development step is integrating llama.cpp using Android NDK/JNI for arm64-v8a.

## Model suggestion
Qwen2.5-1.5B-Instruct GGUF Q4_K_M (approximately 1 GB). Keep several GB free for import and working space.

## Build
Open this repository in Android Studio with JDK 17 and Android SDK 35, sync Gradle, and build an APK. A Gradle wrapper and prebuilt APK are not included yet.
