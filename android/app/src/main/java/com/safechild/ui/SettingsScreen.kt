package com.safechild.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.safechild.R
import com.safechild.sos.EmergencyNumbers
import com.safechild.util.limitVisibleChars

private val DangerRed = Color(0xFFFF4757)
const val OTHER_COUNTRY = "OTHER"
const val MAX_CONNECTIONS = 10

data class SettingsUiState(
    val nickname: String,
    val alwaysOn: Boolean,
    val trackMe: Boolean,
    val languageCode: String,   // "en" or "bn"
    val countryCode: String,    // ISO code or OTHER_COUNTRY
    val isUnsafe: Boolean,
    val connectionCount: Int,   // 0..MAX_CONNECTIONS
)

data class SettingsActions(
    val onChangeNickname: (String) -> Unit,
    val onChangePassword: () -> Unit,          // needs the server (later phase)
    val onAlwaysOnChange: (Boolean) -> Unit,   // ask the phone for permissions, start or stop the service
    val onTrackMeChange: (Boolean) -> Unit,
    val onTrackPerson: () -> Unit,             // needs the server (later phase)
    val onLanguageChange: (String) -> Unit,
    val onChangePairCode: () -> Unit,          // needs the server (later phase)
    val onCountryChange: (String) -> Unit,
    val onSetSafe: (password: String) -> Boolean, // true if the password is correct
    val onLogout: () -> Unit,
)

@Composable
fun SettingsScreen(
    state: SettingsUiState,
    actions: SettingsActions,
    emergency: EmergencyNumbers,
    modifier: Modifier = Modifier,
) {
    var dialog by remember { mutableStateOf<Dialog?>(null) }

    val countryLabel = if (state.countryCode == OTHER_COUNTRY) {
        stringResource(R.string.settings_country_other, emergency.fallbackNumber)
    } else {
        emergency.countries.firstOrNull { it.code == state.countryCode }
            ?.let { "${it.name} (${it.number})" } ?: state.countryCode
    }
    val languageLabel = if (state.languageCode == "bn") "বাংলা" else "English"

    Column(modifier.verticalScroll(rememberScrollState())) {
        Text(
            stringResource(R.string.settings_title),
            style = MaterialTheme.typography.headlineSmall,
            modifier = Modifier.padding(20.dp),
        )
        SettingRow(
            stringResource(R.string.settings_nickname),
            value = state.nickname.ifBlank { "-" },
        ) { dialog = Dialog.Nickname }
        SettingRow(stringResource(R.string.settings_password), onClick = actions.onChangePassword)
        SwitchRow(
            stringResource(R.string.settings_always_on),
            stringResource(R.string.settings_always_on_desc),
            state.alwaysOn, actions.onAlwaysOnChange,
        )
        SwitchRow(
            stringResource(R.string.settings_track_me),
            stringResource(R.string.settings_track_me_desc),
            state.trackMe, actions.onTrackMeChange,
        )
        SettingRow(
            stringResource(R.string.settings_track_person),
            value = "${state.connectionCount}/$MAX_CONNECTIONS",
            onClick = actions.onTrackPerson,
        )
        SettingRow(stringResource(R.string.settings_language), value = languageLabel) {
            dialog = Dialog.Language
        }
        SettingRow(stringResource(R.string.settings_pair_code), onClick = actions.onChangePairCode)
        SettingRow(stringResource(R.string.settings_country), value = countryLabel) {
            dialog = Dialog.Country
        }
        SettingRow(
            stringResource(R.string.settings_status),
            value = stringResource(if (state.isUnsafe) R.string.status_unsafe else R.string.status_safe),
            valueColor = if (state.isUnsafe) DangerRed else Color.Unspecified,
        ) { if (state.isUnsafe) dialog = Dialog.SetSafe }
        SettingRow(
            stringResource(R.string.settings_logout),
            titleColor = DangerRed,
        ) { dialog = Dialog.Logout }
    }

    when (dialog) {
        Dialog.Nickname -> NicknameDialog(
            initial = state.nickname,
            onSave = { actions.onChangeNickname(it); dialog = null },
            onDismiss = { dialog = null },
        )
        Dialog.Language -> LanguageDialog(
            onPick = { actions.onLanguageChange(it); dialog = null },
            onDismiss = { dialog = null },
        )
        Dialog.Country -> CountryDialog(
            emergency = emergency,
            onPick = { actions.onCountryChange(it); dialog = null },
            onDismiss = { dialog = null },
        )
        Dialog.SetSafe -> SetSafeDialog(
            onConfirm = { password -> actions.onSetSafe(password).also { if (it) dialog = null } },
            onDismiss = { dialog = null },
        )
        Dialog.Logout -> LogoutDialog(
            onConfirm = { actions.onLogout(); dialog = null },
            onDismiss = { dialog = null },
        )
        null -> Unit
    }
}

private enum class Dialog { Nickname, Language, Country, SetSafe, Logout }

@Composable
private fun SettingRow(
    title: String,
    value: String? = null,
    valueColor: Color = Color.Unspecified,
    titleColor: Color = Color.Unspecified,
    onClick: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 20.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(title, color = titleColor, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
        if (value != null) Text(value, color = valueColor, style = MaterialTheme.typography.bodyMedium)
    }
    HorizontalDivider()
}

@Composable
private fun SwitchRow(title: String, description: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(description, style = MaterialTheme.typography.bodySmall)
        }
        Switch(checked = checked, onCheckedChange = onChange)
    }
    HorizontalDivider()
}

@Composable
private fun NicknameDialog(initial: String, onSave: (String) -> Unit, onDismiss: () -> Unit) {
    var text by remember { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.settings_nickname)) },
        text = {
            OutlinedTextField(
                value = text,
                onValueChange = { text = limitVisibleChars(it, 8) },
                label = { Text(stringResource(R.string.nickname_hint)) },
                singleLine = true,
            )
        },
        confirmButton = {
            TextButton(onClick = { onSave(text.trim()) }, enabled = text.isNotBlank()) {
                Text(stringResource(R.string.dialog_save))
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.dialog_cancel)) } },
    )
}

@Composable
private fun LanguageDialog(onPick: (String) -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.settings_language)) },
        text = {
            Column {
                TextButton(onClick = { onPick("en") }) { Text("English") }
                TextButton(onClick = { onPick("bn") }) { Text("বাংলা") }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.dialog_cancel)) } },
    )
}

@Composable
private fun CountryDialog(emergency: EmergencyNumbers, onPick: (String) -> Unit, onDismiss: () -> Unit) {
    val sorted = remember(emergency) { emergency.countries.sortedBy { it.name } }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.settings_country)) },
        text = {
            LazyColumn {
                item {
                    Text(
                        stringResource(R.string.settings_country_other, emergency.fallbackNumber),
                        modifier = Modifier.fillMaxWidth().clickable { onPick(OTHER_COUNTRY) }.padding(vertical = 12.dp),
                    )
                }
                items(sorted) { c ->
                    Text(
                        "${c.name}  (${c.number})",
                        modifier = Modifier.fillMaxWidth().clickable { onPick(c.code) }.padding(vertical = 12.dp),
                    )
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.dialog_cancel)) } },
    )
}

@Composable
private fun SetSafeDialog(onConfirm: (String) -> Boolean, onDismiss: () -> Unit) {
    var password by remember { mutableStateOf("") }
    var wrong by remember { mutableStateOf(false) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.set_safe_title)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(R.string.set_safe_message))
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it; wrong = false },
                    label = { Text(stringResource(R.string.password_label)) },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    isError = wrong,
                )
                if (wrong) Text(stringResource(R.string.wrong_password), color = DangerRed)
            }
        },
        confirmButton = {
            TextButton(onClick = { if (!onConfirm(password)) wrong = true }, enabled = password.isNotEmpty()) {
                Text(stringResource(R.string.dialog_ok))
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.dialog_cancel)) } },
    )
}

@Composable
private fun LogoutDialog(onConfirm: () -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.logout_confirm_title)) },
        text = { Text(stringResource(R.string.logout_confirm_message)) },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text(stringResource(R.string.settings_logout), color = DangerRed)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.dialog_cancel)) } },
    )
}
