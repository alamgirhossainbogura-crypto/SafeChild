package com.safechild.sos

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel

/** Runs while "Always on" is enabled: keeps the keyword detector alive and starts the SOS engine. */
class SosForegroundService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var engine: SosEngine
    private var detector: KeywordDetector? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
        engine = SosEngine(this, scope) {
            // Phase 2: set status Unsafe, turn Track me on, notify the paired people
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startAsForeground()
        if (intent?.action == ACTION_TRIGGER_SOS) trigger() else startListening()
        return START_STICKY
    }

    private fun startListening() {
        val filter = DoubleHitFilter { trigger() }
        detector = NoopDetector().also { it.start { filter.hit() } }
    }

    private fun trigger() = engine.start(loadConfig())

    private fun loadConfig() = SosConfig(
        nickname = "Me",                                   // TODO read from settings
        contacts = listOf("01XXXXXXXXX", "01YYYYYYYYY"),   // TODO read from settings
        emergencyNumber = EmergencyNumbers.forCountry("BD") ?: "999", // TODO read the Country setting
    )

    private fun startAsForeground() {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("SafeChild protection is on")
            .setContentText("Say \"help help\" or \"বাঁচাও বাঁচাও\"")
            .setOngoing(true)
            .build()
        ServiceCompat.startForeground(
            this, 1, notification,
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE or ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
        )
    }

    private fun createChannel() {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "SafeChild protection", NotificationManager.IMPORTANCE_LOW)
        )
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        detector?.stop()
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        const val ACTION_TRIGGER_SOS = "com.safechild.ACTION_TRIGGER_SOS"
        private const val CHANNEL_ID = "protection"
    }
}
