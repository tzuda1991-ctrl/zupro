# ZUPRO AI — Offline Android assistant

Kotlin Android chat interface with **llama.cpp** native inference through JNI.

## Build requirements
- Android Studio, JDK 17, Android SDK 35
- Android NDK and CMake 3.22.1
- Internet access on the **build computer** to fetch llama.cpp sources at configure time
- arm64 Android phone with about 6 GB RAM

Open in Android Studio, sync, and build APK. A Gradle wrapper is not included yet. This project has **not been built or tested** in this environment.

## Offline model
Try Qwen2.5-1.5B-Instruct GGUF Q4_K_M. Download a trusted GGUF file, then import it through the app. Import duplicates the file into app storage; allow extra free disk space. Once installed and imported, the app does not request internet permission.

## Native integration
CMake fetches upstream llama.cpp. The JNI bridge loads a GGUF model, creates a context, tokenizes ChatML-formatted prompts, and samples responses on-device. The bridge uses llama.cpp's current C API; upstream API changes may require adjustments. Pin a tested upstream commit before production releases.

## Limitations
- Simple single-turn text generation, not a persistent chat history
- No token streaming, cancellation, or model download UI
- CPU inference may be slow and memory usage varies by phone
- No prebuilt APK or CI build validation yet
