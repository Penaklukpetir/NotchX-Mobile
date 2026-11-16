package com.notchx.remote

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class NotchXCommandReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_SEND_COMMAND) return

        val commandType = intent.getStringExtra(EXTRA_COMMAND_TYPE) ?: return
        val actionName = intent.getStringExtra(EXTRA_ACTION_NAME) ?: return

        val prefs = context.getSharedPreferences(CAPACITOR_PREFS_NAME, Context.MODE_PRIVATE)
        val rawUrl = (prefs.getString("supabase_url", "") ?: "").trim().trimEnd('/')
        val anonKey = (prefs.getString("supabase_anon_key", "") ?: "").trim()
        val targetDevice = (prefs.getString("device_name", "windows") ?: "windows").trim()

        if (rawUrl.isEmpty() || anonKey.isEmpty()) {
            showToast(context, "NotchX: Buka aplikasi sekali untuk sinkronisasi kunci Supabase")
            return
        }

        val pendingResult = goAsync()
        showToast(context, "NotchX: Mengirim $actionName...")

        thread(start = true) {
            try {
                val baseUrl = if (rawUrl.endsWith("/rest/v1", ignoreCase = true)) {
                    rawUrl.dropLast("/rest/v1".length).trimEnd('/')
                } else {
                    rawUrl
                }

                val endpoint = URL("$baseUrl/rest/v1/notchx_commands")
                val conn = (endpoint.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 8000
                    readTimeout = 8000
                    doOutput = true
                    setRequestProperty("apikey", anonKey)
                    setRequestProperty("Authorization", "Bearer $anonKey")
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("Prefer", "return=minimal")
                }

                val payloadJson = JSONObject().apply {
                    put("action", actionName)
                }

                val bodyJson = JSONObject().apply {
                    put("source_device", "android")
                    put("target_device", targetDevice.ifEmpty { "windows" })
                    put("command_type", commandType)
                    put("payload", payloadJson)
                    put("status", "pending")
                }

                OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { writer ->
                    writer.write(bodyJson.toString())
                    writer.flush()
                }

                val code = conn.responseCode
                conn.disconnect()

                if (code in 200..299) {
                    showToast(context, "NotchX: Perintah terkirim ($actionName)")
                } else {
                    showToast(context, "NotchX: Gagal mengirim (HTTP $code)")
                }
            } catch (e: Exception) {
                showToast(context, "NotchX: Gagal terhubung ke Supabase")
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun showToast(context: Context, message: String) {
        Handler(Looper.getMainLooper()).post {
            Toast.makeText(context.applicationContext, message, Toast.LENGTH_SHORT).show()
        }
    }

    companion object {
        const val CAPACITOR_PREFS_NAME = "CapacitorStorage"
        const val ACTION_SEND_COMMAND = "com.notchx.remote.ACTION_SEND_COMMAND"
        const val EXTRA_COMMAND_TYPE = "extra_command_type"
        const val EXTRA_ACTION_NAME = "extra_action_name"
    }
}
