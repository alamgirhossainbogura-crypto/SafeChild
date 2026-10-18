package com.safechild.sos

import android.os.SystemClock

/** On-device keyword spotting ("help", "বাঁচাও"). No audio may leave the phone. */
interface KeywordDetector {
    /** Calls onKeyword every time ONE keyword is heard. */
    fun start(onKeyword: () -> Unit)
    fun stop()
}

/** Placeholder until a real detector is chosen and tested for Bangla. */
class NoopDetector : KeywordDetector {
    override fun start(onKeyword: () -> Unit) {}
    override fun stop() {}
}

/** "help help" / "বাঁচাও বাঁচাও": the keyword must be heard twice within the window. */
class DoubleHitFilter(
    private val windowMs: Long = 3_000,
    private val onConfirmed: () -> Unit,
) {
    private var last = 0L
    fun hit() {
        val now = SystemClock.elapsedRealtime()
        if (last != 0L && now - last <= windowMs) { last = 0L; onConfirmed() } else last = now
    }
}
