package com.notchx.remote

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

class NotchXWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.notchx_widget)

            // 1. Voice Prompt Deep Link (notchx://voice)
            views.setOnClickPendingIntent(
                R.id.btn_widget_voice,
                buildDeepLinkPendingIntent(context, "notchx://voice", 101)
            )

            // 2. Cari File Deep Link (notchx://files)
            views.setOnClickPendingIntent(
                R.id.btn_widget_files,
                buildDeepLinkPendingIntent(context, "notchx://files", 102)
            )

            // 3. Play / Pause Media (Background HTTP POST)
            views.setOnClickPendingIntent(
                R.id.btn_widget_play_pause,
                buildCommandPendingIntent(
                    context = context,
                    commandType = "media_control",
                    actionName = "play_pause",
                    requestCode = 201
                )
            )

            // 4. Mute Laptop (Background HTTP POST)
            views.setOnClickPendingIntent(
                R.id.btn_widget_mute,
                buildCommandPendingIntent(
                    context = context,
                    commandType = "media_control",
                    actionName = "mute",
                    requestCode = 202
                )
            )

            // 5. Lock PC (Background HTTP POST)
            views.setOnClickPendingIntent(
                R.id.btn_widget_lock,
                buildCommandPendingIntent(
                    context = context,
                    commandType = "system_action",
                    actionName = "lock",
                    requestCode = 203
                )
            )

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun buildDeepLinkPendingIntent(
            context: Context,
            uriString: String,
            requestCode: Int
        ): PendingIntent {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uriString), context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            return PendingIntent.getActivity(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        private fun buildCommandPendingIntent(
            context: Context,
            commandType: String,
            actionName: String,
            requestCode: Int
        ): PendingIntent {
            val intent = Intent(context, NotchXCommandReceiver::class.java).apply {
                action = NotchXCommandReceiver.ACTION_SEND_COMMAND
                putExtra(NotchXCommandReceiver.EXTRA_COMMAND_TYPE, commandType)
                putExtra(NotchXCommandReceiver.EXTRA_ACTION_NAME, actionName)
            }
            return PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }
    }
}
