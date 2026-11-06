package com.zupro.ai

import android.content.Context
import java.io.File

class OfflineEngine(private val context: Context) {
    private var modelPath: String? = null

    fun load(path: String): String {
        if (!File(path).exists()) return "Model not found."
        modelPath = path
        return "Model imported: ${File(path).name}. Inference engine is not installed yet."
    }

    fun generate(prompt: String): String {
        if (modelPath == null) return "Please import a GGUF model first."
        return "Offline inference is not available in this starter yet. Next step: integrate llama.cpp native library."
    }
}
