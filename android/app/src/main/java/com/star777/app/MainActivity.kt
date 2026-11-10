package com.star777.app

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebResourceRequest
import android.content.Intent
import android.net.Uri
import android.webkit.WebChromeClient
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : Activity() {
    private lateinit var web: WebView
    private val url = "https://zupro-production.up.railway.app"
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.addJavascriptInterface(object {
            @JavascriptInterface fun registerPush() { runOnUiThread { registerPushToken() } }
        }, "Star777Android")
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val target = request?.url ?: return true
                if (target.scheme == "https" && target.host == "zupro-production.up.railway.app") return false
                if (target.scheme == "https" || target.scheme == "mailto") startActivity(Intent(Intent.ACTION_VIEW, target))
                return true
            }
            override fun onPageFinished(view: WebView?, loadedUrl: String?) {
                super.onPageFinished(view, loadedUrl)
                if (loadedUrl?.startsWith(url) == true) registerPushToken()
            }
        }
        web.webChromeClient = WebChromeClient()
        setContentView(web)
        web.loadUrl(url)
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 700)
    }
    private fun registerPushToken() {
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            val jsonToken = org.json.JSONObject.quote(token)
            web.evaluateJavascript("window.star777ReceiveFcmToken && window.star777ReceiveFcmToken($jsonToken)", null)
        }
    }
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() { if (web.canGoBack()) web.goBack() else super.onBackPressed() }
}
