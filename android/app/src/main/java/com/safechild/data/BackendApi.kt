package com.safechild.data

import com.google.firebase.Firebase
import com.google.firebase.functions.FirebaseFunctionsException
import com.google.firebase.functions.functions
import kotlinx.coroutines.tasks.await

data class FirstAidReply(val reply: String, val urgent: Boolean)

/** Thrown when the server locked this try (too many wrong pair codes). */
class TooManyTriesException : Exception("Too many wrong tries. Please try again later.")

/** One place that talks to the Firebase Cloud Functions. The user must be logged in. */
class BackendApi {
    private val functions = Firebase.functions("asia-south1")

    private suspend fun call(name: String, data: Map<String, Any?> = emptyMap()): Map<*, *> {
        val result = functions.getHttpsCallable(name).call(data).await()
        return (result.data as? Map<*, *>) ?: emptyMap<String, Any>()
    }

    // ---- Profile and pairing ----

    suspend fun setNickname(nickname: String) {
        call("setNickname", mapOf("nickname" to nickname))
    }

    /** Six digits. Also links the verified email or phone number to this account. */
    suspend fun setPairCode(code: String) {
        call("setPairCode", mapOf("code" to code))
    }

    /**
     * The server always answers the same, so this never tells whether the account exists.
     * [identifier] is an email or a phone number like +8801712345678.
     */
    suspend fun requestConnection(identifier: String, code: String) {
        try {
            call("requestConnection", mapOf("identifier" to identifier, "code" to code))
        } catch (e: FirebaseFunctionsException) {
            if (e.code == FirebaseFunctionsException.Code.RESOURCE_EXHAUSTED) throw TooManyTriesException()
            throw e
        }
    }

    suspend fun respondToRequest(fromUid: String, accept: Boolean) {
        call("respondToRequest", mapOf("fromUid" to fromUid, "accept" to accept))
    }

    suspend fun removeConnection(otherUid: String) {
        call("removeConnection", mapOf("otherUid" to otherUid))
    }

    suspend fun registerFcmToken(token: String) {
        call("registerFcmToken", mapOf("token" to token))
    }

    // ---- SOS and location ----

    suspend fun startSos(lat: Double?, lng: Double?, battery: Int?) {
        call("startSos", mapOf("lat" to lat, "lng" to lng, "battery" to battery))
    }

    suspend fun updateLocation(lat: Double, lng: Double, battery: Int?) {
        call("updateLocation", mapOf("lat" to lat, "lng" to lng, "battery" to battery))
    }

    suspend fun setTrackMe(value: Boolean) {
        call("setTrackMe", mapOf("value" to value))
    }

    /** Call this only after the password was checked on the phone. */
    suspend fun setSafe() {
        call("setSafe")
    }

    // ---- First Aid AI ----

    /** [history] is the whole chat so far. role is "user" or "model". The last item must be the user's. */
    suspend fun askFirstAid(history: List<Pair<String, String>>): FirstAidReply {
        val messages = history.map { (role, text) -> mapOf("role" to role, "text" to text) }
        val r = call("firstAidChat", mapOf("messages" to messages))
        return FirstAidReply(
            reply = r["reply"] as? String ?: "",
            urgent = r["urgent"] as? Boolean ?: false,
        )
    }
}
