package com.safechild.util

import android.icu.text.BreakIterator

/** Cuts text to at most [max] visible characters, so a Bangla conjunct counts as one. */
fun limitVisibleChars(text: String, max: Int): String {
    val bi = BreakIterator.getCharacterInstance()
    bi.setText(text)
    var end = 0
    repeat(max) {
        val next = bi.next()
        if (next == BreakIterator.DONE) return text
        end = next
    }
    return text.substring(0, end)
}
