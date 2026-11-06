package com.zupro.ai

import android.app.Activity
import android.os.Bundle
import android.content.Intent
import android.net.Uri
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.widget.*
import java.io.File

class MainActivity : Activity() {
    private lateinit var engine: OfflineEngine
    private lateinit var messages: LinearLayout
    private lateinit var scroll: ScrollView
    private lateinit var input: EditText
    private lateinit var send: Button
    private lateinit var status: TextView
    private var busy = false
    private val bg = Color.rgb(12, 16, 26)
    private val panel = Color.rgb(27, 34, 49)
    private val accent = Color.rgb(49, 211, 173)

    private fun shape(color: Int, radius: Float = 20f): GradientDrawable =
        GradientDrawable().apply { setColor(color); cornerRadius = radius * resources.displayMetrics.density }

    private fun dp(n: Int): Int = (n * resources.displayMetrics.density).toInt()

    private fun text(value: String, size: Float, color: Int = Color.WHITE): TextView =
        TextView(this).apply { text = value; textSize = size; setTextColor(color) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        engine = OfflineEngine(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(bg)
            setPadding(dp(16), dp(24), dp(16), dp(12))
        }
        val heading = text("✦  ZUPRO AI", 25f).apply { setTypeface(null, Typeface.BOLD) }
        root.addView(heading)
        status = text("●  Offline • No model selected", 12f, accent).apply {
            setPadding(0, dp(6), 0, dp(16))
        }
        root.addView(status)
        val model = Button(this).apply {
            text = "＋  Import GGUF model"
            isAllCaps = false
            setTextColor(Color.WHITE)
            background = shape(panel)
            setOnClickListener {
                startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }, 101)
            }
        }
        root.addView(model, LinearLayout.LayoutParams(-1, dp(50)))
        scroll = ScrollView(this).apply { fillViewport = true }
        messages = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, dp(18), 0, dp(16))
        }
        scroll.addView(messages)
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        bubble("Welcome to ZUPRO AI. Import a GGUF model to start a private chat.", false)
        val composer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = shape(panel)
            setPadding(dp(8), dp(4), dp(4), dp(4))
        }
        input = EditText(this).apply {
            hint = "Message ZUPRO..."
            setHintTextColor(Color.LTGRAY)
            setTextColor(Color.WHITE)
            textSize = 15f
            minLines = 1
            maxLines = 4
            background = null
        }
        composer.addView(input, LinearLayout.LayoutParams(0, -2, 1f))
        send = Button(this).apply {
            text = "➤"
            textSize = 19f
            setTextColor(bg)
            background = shape(accent)
            setOnClickListener { sendMessage() }
        }
        composer.addView(send, LinearLayout.LayoutParams(dp(58), dp(48)))
        root.addView(composer)
        setContentView(root)
    }

    private fun bubble(message: String, user: Boolean): TextView {
        val label = text(message, 15f).apply {
            setPadding(dp(14), dp(12), dp(14), dp(12))
            background = shape(if (user) Color.rgb(26, 111, 99) else panel)
        }
        val wrap = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = if (user) Gravity.END else Gravity.START
            setPadding(0, dp(6), 0, dp(6))
        }
        wrap.addView(label, LinearLayout.LayoutParams(-2, -2))
        messages.addView(wrap)
        scroll.post { scroll.fullScroll(View.FOCUS_DOWN) }
        return label
    }

    private fun sendMessage() {
        val question = input.text.toString().trim()
        if (question.isEmpty() || busy) return
        busy = true
        send.isEnabled = false
        input.setText("")
        bubble(question, true)
        val reply = bubble("Thinking on device…", false)
        Thread {
            val result = try { engine.generate(question) }
                catch (e: Exception) { "Generation error: ${e.message}" }
            runOnUiThread {
                reply.text = result
                busy = false
                send.isEnabled = true
                scroll.post { scroll.fullScroll(View.FOCUS_DOWN) }
            }
        }.start()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != 101 || resultCode != RESULT_OK) return
        val uri: Uri = data?.data ?: return
        status.text = "●  Importing model…"
        Thread {
            val result = try {
                val file = File(filesDir, "model.gguf")
                contentResolver.openInputStream(uri)!!.use { source ->
                    file.outputStream().use { target -> source.copyTo(target) }
                }
                engine.load(file.absolutePath)
            } catch (e: Exception) { "Model import failed: ${e.message}" }
            runOnUiThread {
                status.text = if (result.startsWith("Offline model ready")) "●  Model ready • Offline" else "●  Model error"
                bubble(result, false)
            }
        }.start()
    }
}
