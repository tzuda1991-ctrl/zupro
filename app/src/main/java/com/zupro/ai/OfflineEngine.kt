package com.zupro.ai

import android.content.Context
import java.io.File

class OfflineEngine(private val context: Context) {
    companion object {
        init { System.loadLibrary("zupro") }
    }

    private external fun nativeLoadModel(path: String): Boolean
    private external fun nativeGenerate(prompt: String, maxTokens: Int): String
    private external fun nativeUnloadModel()

    @Synchronized
    fun load(path: String): String {
        if (!File(path).isFile) return "Model file not found."
        return if (nativeLoadModel(path)) "Offline model ready. Ask ZUPRO anything!"
        else "Could not load GGUF model. Try a smaller Q4 model."
    }

    @Synchronized
    fun generate(prompt: String): String {
        return nativeGenerate(prompt, 48)
    }

    @Synchronized
    fun close() = nativeUnloadModel()
}
