package com.safechild.sos

/**
 * Country -> emergency number. Bundled in the app so it works offline.
 * Fill this table from a verified official source. Do not type numbers from memory:
 * a wrong number is dangerous. Some countries have separate police, ambulance and fire numbers.
 */
object EmergencyNumbers {
    private val byCountry: Map<String, String> = mapOf(
        "BD" to "999",
        // TODO: add the other countries from a verified list
    )

    fun forCountry(code: String): String? = byCountry[code.uppercase()]
}
