package com.zupro.ai

import android.app.Activity
import android.os.Bundle
import android.content.Intent
import android.net.Uri
import android.graphics.Color
import android.view.Gravity
import android.view.ViewGroup
import android.widget.*
import java.io.File

class MainActivity : Activity() {
    private lateinit var output: TextView
    private lateinit var prompt: EditText
    private lateinit var engine: OfflineEngine
    private val pickModel = 101

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        engine = OfflineEngine(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(28, 36, 28, 24)
            setBackgroundColor(Color.rgb(15, 19, 31))
        }
        fun label(s: String, size: Float): TextView = TextView(this).apply {
            text = s; textSize = size; setTextColor(Color.WHITE)
            setPadding(0, 12, 0, 12)
        }
        root.addView(label("ZUPRO AI", 28f))
        root.addView(label("Private • Offline • On-device", 14f))
        val pick = Button(this).apply { text = "Select GGUF model"; setOnClickListener {
            startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                type = "*/*"; addCategory(Intent.CATEGORY_OPENABLE)
            }, pickModel)
        } }
        root.addView(pick)
        output = label("Choose a small GGUF model to begin.", 16f)
        val scroll = ScrollView(this).apply { addView(output) }
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        prompt = EditText(this).apply {
            hint = "Ask ZUPRO anything"; setTextColor(Color.WHITE)
            setHintTextColor(Color.LTGRAY); minLines = 2
        }
        root.addView(prompt)
        root.addView(Button(this).apply { text = "Send"; setOnClickListener {
            val question = prompt.text.toString().trim()
            if (question.isNotEmpty()) {
                output.append("\n\nYou: $question\nZUPRO: ")
                Thread {
                    val answer = engine.generate(question)
                    runOnUiThread { output.append(answer) }
                }.start()
            }
        } })
        setContentView(root)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == pickModel && resultCode == RESULT_OK) {
            val uri: Uri = data?.data ?: return
            output.text = "Importing model; please wait..."
            Thread {
                try {
                    val file = File(filesDir, "model.gguf")
                    contentResolver.openInputStream(uri)!!.use { input ->
                        file.outputStream().use { output -> input.copyTo(output) }
                    }
                    val message = engine.load(file.absolutePath)
                    runOnUiThread { output.text = message }
                } catch (e: Exception) {
                    runOnUiThread { output.text = "Import failed: ${e.message}" }
                }
            }.start()
        }
    }
}
