package com.star777.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class Star777MessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        getSharedPreferences("star777_push", MODE_PRIVATE).edit().putString("token", token).apply()
    }
    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.data["title"] ?: message.notification?.title ?: "STAR777 Result"
        val body = message.data["body"] ?: message.notification?.body ?: "New market result available"
        val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "star777_results"
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(NotificationChannel(channelId, "Market results", NotificationManager.IMPORTANCE_DEFAULT))
        val intent = Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val pending = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title.take(90)).setContentText(body.take(200))
            .setAutoCancel(true).setContentIntent(pending).build()
        manager.notify((System.currentTimeMillis() % Int.MAX_VALUE).toInt(), notification)
    }
}
