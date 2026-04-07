package com.popa.calculator   // ← CHANGE THIS to your actual package name

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.webkit.*
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)

        // ── WebView Settings ─────────────────────────────────────────────
        webView.settings.apply {
            javaScriptEnabled = true           // Required: JS must be on
            domStorageEnabled = true           // Required: localStorage for theme/currency cache
            allowFileAccessFromFileURLs = true // Required: JS files loaded from assets
            allowUniversalAccessFromFileURLs = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            setSupportZoom(false)              // Disable zoom (your meta tag handles this)
            builtInZoomControls = false
            displayZoomControls = false
            loadWithOverviewMode = true
            useWideViewPort = true
            mediaPlaybackRequiresUserGesture = false
            // Modern rendering performance
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                safeBrowsingEnabled = false    // Disable for local assets (no remote URLs)
            }
        }

        // ── Hardware Acceleration ─────────────────────────────────────────
        webView.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null)

        // ── Native Bridge (JavaScript → Android) ─────────────────────────
        webView.addJavascriptInterface(WebAppInterface(this), "Android")

        // ── WebChromeClient (for console logs during dev) ─────────────────
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(msg: ConsoleMessage): Boolean {
                android.util.Log.d("CalcApp-JS", "${msg.message()} [${msg.sourceId()}:${msg.lineNumber()}]")
                return true
            }
        }

        // ── WebViewClient (handle navigation inside app) ──────────────────
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                // Keep all navigation inside the WebView
                val url = request.url.toString()
                return if (url.startsWith("file://")) {
                    false  // Allow local asset file loading
                } else {
                    // Open external URLs in the system browser instead
                    true
                }
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                android.util.Log.e("CalcApp", "WebView Error: ${error.description}")
            }
        }

        // ── Load the App ──────────────────────────────────────────────────
        webView.loadUrl("file:///android_asset/op1.html")
    }

    // ── Handle Android Back Button ────────────────────────────────────────
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    // ── Native Bridge Class ───────────────────────────────────────────────
    // This is called from your ui.js via: window.Android.showToast("message")
    inner class WebAppInterface(private val ctx: Context) {

        @JavascriptInterface
        fun showToast(message: String) {
            runOnUiThread {
                Toast.makeText(ctx, message, Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun vibrate(ms: Long = 50L) {
            runOnUiThread {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val vm = ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                    vm.defaultVibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    val v = ctx.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
                    } else {
                        @Suppress("DEPRECATION")
                        v.vibrate(ms)
                    }
                }
            }
        }
    }
}
