# Emergency numbers used by SafeChild

SafeChild calls one emergency number when the SOS chain reaches its last step (first contact, second contact, then the emergency number of the selected country). The number is also shown in the middle of the top bar.

## How the app picks the number

1. The user selects a country in **Settings > Country**.
2. If the country is in the tables below, the app uses its number.
3. For every other country the app uses the fallback number **112**.

> 112 is the standard emergency number on GSM mobile networks and works in many countries, but not guaranteed everywhere. The app should tell the user to check the local number.

If a country has separate numbers for police, ambulance and fire, the table lists the **police number**. If one number serves every service, that number is listed. When a source lists several numbers, the first is used and the rest appear under *Other numbers*.

## Important warning

Compiled from public lists (Wikipedia, Microsoft Teams, a second list), not from official sources. Verify every number with official government sources before release. Entries with review=true have conflicting or single-source data.

Rows marked **Needs check** have conflicting or single-source data. Please send a correction with an official source (government, telecom regulator or embassy page) if you find a wrong number.

## Asia

| Country | Code | Number | Other numbers | Check |
|---|---|---|---|---|
| Afghanistan | AF | **119** | - | - |
| Armenia | AM | **112** | 911 | - |
| Azerbaijan | AZ | **102** | 112 | Needs check |
| Bahrain | BH | **999** | 112 | - |
| Bangladesh | BD | **999** | - | - |
| Bhutan | BT | **113** | - | - |
| Brunei | BN | **993** | - | - |
| Cambodia | KH | **117** | - | - |
| China | CN | **110** | - | - |
| Cyprus | CY | **112** | 199 | - |
| East Timor | TL | **112** | - | - |
| Georgia | GE | **112** | - | - |
| Hong Kong | HK | **999** | 112 | - |
| India | IN | **112** | 100 | - |
| Indonesia | ID | **112** | 110 | - |
| Iran | IR | **110** | - | - |
| Iraq | IQ | **112** | 911 | - |
| Israel | IL | **100** | 112 | - |
| Japan | JP | **110** | - | - |
| Jordan | JO | **911** | 112 | - |
| Kazakhstan | KZ | **112** | 102 | - |
| Kuwait | KW | **112** | - | - |
| Kyrgyzstan | KG | **102** | 112 | Needs check |
| Laos | LA | **191** | - | - |
| Lebanon | LB | **999** | 112 | - |
| Macau | MO | **999** | - | - |
| Malaysia | MY | **999** | 112 | - |
| Maldives | MV | **119** | 911 | Needs check |
| Mongolia | MN | **102** (police number; 105 listed as general number) | 105 | - |
| Myanmar | MM | **999** | 199 | Needs check |
| Nepal | NP | **100** | 112 | - |
| North Korea | KP | **110** | - | Needs check |
| Oman | OM | **9999** | 112 | - |
| Pakistan | PK | **15** | 112 | - |
| Palestine | PS | **100** | - | - |
| Philippines | PH | **911** | 112 | - |
| Qatar | QA | **999** | 112 | - |
| Saudi Arabia | SA | **911** | 999 | Needs check |
| Singapore | SG | **999** | 112 | - |
| South Korea | KR | **112** | - | - |
| Sri Lanka | LK | **119** | - | - |
| Syria | SY | **112** | - | - |
| Taiwan | TW | **110** | - | - |
| Tajikistan | TJ | **112** | 102 | - |
| Thailand | TH | **191** | 112, 911 | - |
| Turkey | TR | **112** | 911, 153 | - |
| Turkmenistan | TM | **002** (mobile phones 002, landline 02) | 02, 112 | - |
| United Arab Emirates | AE | **999** | - | - |
| Uzbekistan | UZ | **102** | 112 | Needs check |
| Vietnam | VN | **113** | - | - |
| Yemen | YE | **194** | - | - |

## Other popular countries

| Country | Code | Number | Other numbers | Check |
|---|---|---|---|---|
| Australia | AU | **000** | 112 | - |
| Canada | CA | **911** | - | - |
| Italy | IT | **112** | - | - |
| United Kingdom | GB | **999** | 112 | - |
| United States | US | **911** | - | - |

## Data file

The same data is in [`assets/emergency_numbers_app.json`](../assets/emergency_numbers_app.json). A larger reference file with about 246 countries and territories is kept in `assets/emergency_numbers.json`; it is not used by the app yet.

## Sources compared

- Wikipedia, *List of emergency telephone numbers*
- A second list with police, ambulance and fire columns
- Microsoft Teams, *Emergency numbers for countries and regions*
