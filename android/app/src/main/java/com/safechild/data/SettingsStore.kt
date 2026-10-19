package com.safechild.data

import android.content.Context
import androidx.core.content.edit
import com.safechild.util.PhoneValidator
import com.safechild.util.limitVisibleChars

/** Local settings. Works offline. Later, some of these will sync with the server. */
class SettingsStore(context: Context) {
    private val prefs = context.applicationContext
        .getSharedPreferences("safechild_settings", Context.MODE_PRIVATE)

    var nickname: String
        get() = prefs.getString(K_NICKNAME, "") ?: ""
        set(value) = prefs.edit { putString(K_NICKNAME, limitVisibleChars(value.trim(), MAX_NICKNAME)) }

    /** First emergency contact, international format, for example +8801712345678. */
    var contact1: String
        get() = prefs.getString(K_CONTACT1, "") ?: ""
        private set(value) = prefs.edit { putString(K_CONTACT1, value) }

    /** Second emergency contact. */
    var contact2: String
        get() = prefs.getString(K_CONTACT2, "") ?: ""
        private set(value) = prefs.edit { putString(K_CONTACT2, value) }

    /** ISO country code from Settings > Country. "OTHER" means the fallback number. */
    var countryCode: String
        get() = prefs.getString(K_COUNTRY, "BD") ?: "BD"
        set(value) = prefs.edit { putString(K_COUNTRY, value) }

    var alwaysOn: Boolean
        get() = prefs.getBoolean(K_ALWAYS_ON, false)
        set(value) = prefs.edit { putBoolean(K_ALWAYS_ON, value) }

    var trackMe: Boolean
        get() = prefs.getBoolean(K_TRACK_ME, true)
        set(value) = prefs.edit { putBoolean(K_TRACK_ME, value) }

    /** "en" or "bn". */
    var languageCode: String
        get() = prefs.getString(K_LANGUAGE, "en") ?: "en"
        set(value) = prefs.edit { putString(K_LANGUAGE, value) }

    var isUnsafe: Boolean
        get() = prefs.getBoolean(K_UNSAFE, false)
        set(value) = prefs.edit { putBoolean(K_UNSAFE, value) }

    /** Saves both contacts after checking them. Returns false if a non-empty number is invalid. */
    fun saveContacts(first: String, second: String): Boolean {
        val a = if (first.isBlank()) "" else PhoneValidator.normalize(first) ?: return false
        val b = if (second.isBlank()) "" else PhoneValidator.normalize(second) ?: return false
        contact1 = a
        contact2 = b
        return true
    }

    companion object {
        const val MAX_NICKNAME = 8
        private const val K_NICKNAME = "nickname"
        private const val K_CONTACT1 = "contact1"
        private const val K_CONTACT2 = "contact2"
        private const val K_COUNTRY = "country"
        private const val K_ALWAYS_ON = "always_on"
        private const val K_TRACK_ME = "track_me"
        private const val K_LANGUAGE = "language"
        private const val K_UNSAFE = "unsafe"
    }
}
