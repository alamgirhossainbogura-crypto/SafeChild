package com.safechild.sos

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.CallLog
import android.telecom.TelecomManager
import android.telephony.PhoneStateListener
import android.telephony.SmsManager
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlin.coroutines.resume

sealed interface SosState {
    data object Idle : SosState
    data class Countdown(val secondsLeft: Int) : SosState
    data class Calling(val label: String) : SosState
    data class Waiting(val secondsLeft: Int) : SosState
    data object Finished : SosState
}

data class SosConfig(
    val nickname: String,
    val contacts: List<String>,   // 1st and 2nd saved numbers
    val emergencyNumber: String,  // from the Country setting
)

/**
 * SOS flow: 5 s cancel countdown -> mark Unsafe -> call 1st -> (SMS if unanswered) -> 10 s -> call 2nd
 * -> (SMS if unanswered) -> 10 s -> call emergency number. Calls never stop on their own when someone
 * answers; the next call starts after the current call ends. The "Stop calls" button ends the chain
 * but the user stays Unsafe until Safe is set in Settings.
 * Run this with a scope on Dispatchers.Main (PhoneStateListener needs a Looper thread).
 */
class SosEngine(
    private val ctx: Context,
    private val scope: CoroutineScope,
    private val onUnsafe: () -> Unit, // set Unsafe, turn Track me on, notify the paired people
) {
    private val _state = MutableStateFlow<SosState>(SosState.Idle)
    val state: StateFlow<SosState> = _state
    private var job: Job? = null
    @Volatile private var stopRequested = false

    fun start(config: SosConfig) {
        if (job?.isActive == true) return
        stopRequested = false
        job = scope.launch { run(config) }
    }

    /** Easy cancel, only during the first 5 seconds. */
    fun cancelDuringCountdown() {
        if (_state.value is SosState.Countdown) { job?.cancel(); _state.value = SosState.Idle }
    }

    /** "Stop calls" button: no more calls, status stays Unsafe. */
    fun stopCalls() { stopRequested = true }

    private suspend fun run(c: SosConfig) {
        for (s in 5 downTo 1) { _state.value = SosState.Countdown(s); delay(1000) }
        onUnsafe()
        val location = currentLocation()
        val targets = c.contacts.filter { it.isNotBlank() } + c.emergencyNumber
        for ((i, number) in targets.withIndex()) {
            if (stopRequested) break
            val isEmergency = i == targets.lastIndex
            _state.value = SosState.Calling(number)
            val startedAt = System.currentTimeMillis()
            val placed = placeCallAndWait(number)
            if (!isEmergency) {
                val answered = placed && connectedSeconds(startedAt) >= MIN_REAL_ANSWER_SECONDS
                if (!answered) sendSms(number, c.nickname, location)
                for (s in 10 downTo 1) {
                    if (stopRequested) break
                    _state.value = SosState.Waiting(s); delay(1000)
                }
            }
        }
        _state.value = SosState.Finished
    }

    @SuppressLint("MissingPermission")
    private suspend fun placeCallAndWait(number: String): Boolean {
        val dialed = CompletableDeferred<Unit>()
        val ended = CompletableDeferred<Unit>()
        val unregister = listenCallState { st ->
            if (st == TelephonyManager.CALL_STATE_OFFHOOK) dialed.complete(Unit)
            if (st == TelephonyManager.CALL_STATE_IDLE && dialed.isCompleted) ended.complete(Unit)
        }
        try {
            val telecom = ctx.getSystemService(TelecomManager::class.java)
            telecom.placeCall(Uri.fromParts("tel", number, null), Bundle())
            if (withTimeoutOrNull(15_000) { dialed.await() } == null) return false
            withTimeoutOrNull(180_000) { ended.await() }
            return true
        } finally {
            unregister()
        }
    }

    private fun listenCallState(onState: (Int) -> Unit): () -> Unit {
        val tm = ctx.getSystemService(TelephonyManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val cb = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                override fun onCallStateChanged(state: Int) = onState(state)
            }
            tm.registerTelephonyCallback(ctx.mainExecutor, cb)
            val stop: () -> Unit = { tm.unregisterTelephonyCallback(cb) }
            return stop
        }
        @Suppress("DEPRECATION")
        val l = object : PhoneStateListener() {
            override fun onCallStateChanged(state: Int, phoneNumber: String?) = onState(state)
        }
        @Suppress("DEPRECATION")
        tm.listen(l, PhoneStateListener.LISTEN_CALL_STATE)
        val stop: () -> Unit = {
            @Suppress("DEPRECATION")
            tm.listen(l, PhoneStateListener.LISTEN_NONE)
        }
        return stop
    }

    /** Connected seconds of the latest outgoing call (0 = nobody answered). Needs READ_CALL_LOG. */
    @SuppressLint("MissingPermission")
    private suspend fun connectedSeconds(since: Long): Int {
        delay(1500) // give the call log time to write the entry
        ctx.contentResolver.query(
            CallLog.Calls.CONTENT_URI,
            arrayOf(CallLog.Calls.DURATION),
            "${CallLog.Calls.TYPE}=? AND ${CallLog.Calls.DATE}>=?",
            arrayOf(CallLog.Calls.OUTGOING_TYPE.toString(), since.toString()),
            "${CallLog.Calls.DATE} DESC",
        )?.use { if (it.moveToFirst()) return it.getInt(0) }
        return 0
    }

    @SuppressLint("MissingPermission")
    private suspend fun currentLocation(): Location? = withTimeoutOrNull(8_000) {
        suspendCancellableCoroutine<Location?> { cont ->
            LocationServices.getFusedLocationProviderClient(ctx)
                .getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
                .addOnSuccessListener { cont.resume(it) }
                .addOnFailureListener { cont.resume(null) }
        }
    }

    /** Never put the pair code in this message. */
    private fun sendSms(number: String, nickname: String, loc: Location?) {
        val where = if (loc != null) {
            "https://maps.google.com/?q=${loc.latitude},${loc.longitude} " +
                "(${"%.5f".format(loc.latitude)}, ${"%.5f".format(loc.longitude)})"
        } else "location not available"
        val text = "SOS from $nickname: I need urgent help. Location: $where"
        val sms = smsManager()
        sms.sendMultipartTextMessage(number, null, sms.divideMessage(text), null, null)
    }

    @Suppress("DEPRECATION")
    private fun smsManager(): SmsManager =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) ctx.getSystemService(SmsManager::class.java)
        else SmsManager.getDefault()

    companion object {
        /** A call shorter than this counts as "not really answered" (for example voicemail). */
        const val MIN_REAL_ANSWER_SECONDS = 8
    }
}
