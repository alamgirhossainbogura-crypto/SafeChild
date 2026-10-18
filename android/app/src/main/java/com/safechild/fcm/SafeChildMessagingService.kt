package com.safechild.fcm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.media.AudioAttributes
import android.media.RingtoneManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.safechild.MainActivity
import com.safechild.R
import com.safechild.data.BackendApi
import com.safechild.data.SettingsStore
import kotlinx.coroutines.tasks.await
import java.util.Locale

object NotificationChannels {
    const val SOS = "sos_alerts"
    const val GENERAL = "general"

    fun create(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java)
        val alarm = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        nm.createNotificationChannel(
            NotificationChannel(
                SOS,
                context.getString(R.string.channel_sos_name),
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = context.getString(R.string.channel_sos_desc)
                setSound(alarm, attrs)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 300, 500, 300, 500)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                setBypassDnd(true) // works only if the user allowed it in the phone settings
            }
        )
        nm.createNotificationChannel(
            NotificationChannel(
                GENERAL,
                context.getString(R.string.channel_general_name),
                NotificationManager.IMPORTANCE_DEFAULT,
            )
        )
    }
}

/** Receives the data messages sent by the server (sos, safe, connection_request, connection_accepted). */
class SafeChildMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        // The app sends it to the server after login (see FcmTokenSync). Keep it until then.
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(KEY_PENDING_TOKEN, token).apply()
    }

    override fun onMessageReceived(message: RemoteMessage) {
        NotificationChannels.create(this)
        val data = message.data
        val nickname = data["nickname"].orEmpty().ifBlank { "SafeChild" }
        val fromUid = data["fromUid"].orEmpty()
        val res = localizedContext()

        when (data["type"]) {
            "sos" -> show(
                id = fromUid.hashCode(),
                channel = NotificationChannels.SOS,
                title = res.getString(R.string.notif_sos_title, nickname),
                text = res.getString(R.string.notif_sos_text),
                urgent = true,
                fromUid = fromUid,
                openTab = "map",
            )
            "safe" -> show(
                id = fromUid.hashCode(),
                channel = NotificationChannels.GENERAL,
                title = res.getString(R.string.notif_safe_title, nickname),
                text = res.getString(R.string.notif_safe_text),
                urgent = false,
                fromUid = fromUid,
                openTab = "map",
            )
            "connection_request" -> show(
                id = ("req" + fromUid).hashCode(),
                channel = NotificationChannels.GENERAL,
                title = res.getString(R.string.notif_request_title, nickname),
                text = res.getString(R.string.notif_request_text),
                urgent = false,
                fromUid = fromUid,
                openTab = "requests",
            )
            "connection_accepted" -> show(
                id = ("acc" + fromUid).hashCode(),
                channel = NotificationChannels.GENERAL,
                title = res.getString(R.string.notif_accepted_title),
                text = res.getString(R.string.notif_accepted_text),
                urgent = false,
                fromUid = fromUid,
                openTab = "map",
            )
        }
    }

    /** Uses the language the user picked in Settings, not the phone language. */
    private fun localizedContext(): Context {
        val config = Configuration(resources.configuration)
        config.setLocale(Locale(SettingsStore(this).languageCode))
        return createConfigurationContext(config)
    }

    private fun show(
        id: Int,
        channel: String,
        title: String,
        text: String,
        urgent: Boolean,
        fromUid: String,
        openTab: String,
    ) {
        val open = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_OPEN_TAB, openTab)
            putExtra(EXTRA_FROM_UID, fromUid)
        }
        val pending = PendingIntent.getActivity(
            this, id, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val builder = NotificationCompat.Builder(this, channel)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(title)
            .setContentText(text)
            .setAutoCancel(true)
            .setContentIntent(pending)
        if (urgent) {
            builder.setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        }
        // Without the notification permission (Android 13+) Android drops this silently.
        try {
            NotificationManagerCompat.from(this).notify(id, builder.build())
        } catch (_: SecurityException) {
        }
    }

    companion object {
        const val EXTRA_OPEN_TAB = "open_tab"
        const val EXTRA_FROM_UID = "from_uid"
        private const val PREFS = "safechild_fcm"
        private const val KEY_PENDING_TOKEN = "pending_token"
    }
}

/** Call this after the user logs in, and again whenever the app starts. */
object FcmTokenSync {
    suspend fun sync(api: BackendApi) {
        val token = FirebaseMessaging.getInstance().token.await()
        api.registerFcmToken(token)
    }
}
