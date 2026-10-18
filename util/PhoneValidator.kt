package com.safechild.util

object PhoneValidator {
    /**
     * Bangladesh mobile number. Accepts 01712345678, +8801712345678 and 8801712345678.
     * Returns +8801712345678 or null if the number is not valid.
     */
    fun normalizeBd(input: String): String? {
        val n = input.filter { it.isDigit() || it == '+' }
        val local = when {
            n.startsWith("+880") -> "0" + n.removePrefix("+880")
            n.startsWith("880") -> "0" + n.removePrefix("880")
            else -> n
        }
        return if (Regex("^01[3-9]\\d{8}$").matches(local)) "+88$local" else null
    }

    /** Any other country: international format with a + sign, 8 to 15 digits. */
    fun normalizeInternational(input: String): String? {
        val n = input.filter { it.isDigit() || it == '+' }
        return if (Regex("^\\+[1-9]\\d{7,14}$").matches(n)) n else null
    }

    fun normalize(input: String): String? = normalizeBd(input) ?: normalizeInternational(input)
}
