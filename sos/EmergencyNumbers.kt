package com.safechild.sos

import android.content.Context
import org.json.JSONObject

data class CountryNumber(
    val code: String,
    val name: String,
    val number: String,
    val needsCheck: Boolean,
)

/**
 * Reads assets/emergency_numbers_app.json. Works offline.
 * An unknown country (or "OTHER") uses the fallback number from the file (112).
 */
class EmergencyNumbers private constructor(
    val countries: List<CountryNumber>,
    val fallbackNumber: String,
) {
    fun forCountry(code: String?): String =
        countries.firstOrNull { it.code.equals(code, ignoreCase = true) }?.number ?: fallbackNumber

    fun isKnown(code: String?): Boolean =
        countries.any { it.code.equals(code, ignoreCase = true) }

    companion object {
        fun load(context: Context): EmergencyNumbers {
            val text = context.assets.open("emergency_numbers_app.json")
                .bufferedReader().use { it.readText() }
            val root = JSONObject(text)
            val arr = root.getJSONArray("countries")
            val list = (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                CountryNumber(
                    code = o.getString("code"),
                    name = o.getString("name"),
                    number = o.getString("number"),
                    needsCheck = o.optBoolean("review", false),
                )
            }
            return EmergencyNumbers(list, root.getJSONObject("fallback").getString("number"))
        }
    }
}
