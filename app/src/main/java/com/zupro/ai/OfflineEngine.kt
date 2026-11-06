package com.zupro.ai

import android.content.Context
import java.io.File

class OfflineEngine(private val context: Context) {
    companion object { init { System.loadLibrary("zupro") } }
    private external fun nativeLoadModel(path: String): Boolean
    private external fun nativeGenerateStreaming(prompt: String, maxTokens: Int, callback: TokenCallback): String
    private external fun nativeUnloadModel()

    fun interface TokenCallback {
        fun onToken(text: String)
    }

    @Synchronized
    fun load(path: String): String {
        if (!File(path).isFile) return "Model file not found."
        return if (nativeLoadModel(path)) "Offline model ready. Ask ZUPRO anything!"
        else "Could not load GGUF model. Try a smaller Q4 model."
    }

    @Synchronized
    fun generateStreaming(prompt: String, onToken: (String) -> Unit): String {
        return nativeGenerateStreaming(prompt, 96, TokenCallback { token -> onToken(token) })
    }

    @Synchronized
    fun close() = nativeUnloadModel()
}
