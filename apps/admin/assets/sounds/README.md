# Sound assets

This folder is bundled into the admin app. Two production files exist
today:

- `admin-alert.mp3` — used by the system notification channel
  (`admin-alerts`) and as the loop sound for incoming-call / emergency
  popups. Replacing this affects every admin push.
- `login-success.mp3` — short success chime played after a successful
  login.

## Required files for the full UI feedback set

The `apps/admin/src/lib/sound/play-sound.ts` registry maps every
`SoundKey` to a bundled mp3. Until the per-event files below are
recorded, every key falls back to either `admin-alert.mp3` (alert tones)
or `login-success.mp3` (success / info tones). Drop a new file into
this folder with the exact filename and update `REGISTRY` in
`play-sound.ts` to point at the new module — no other code changes are
needed.

Recommended encoding: **128 kbps mono mp3, < 30 KB per file**.

| Filename                | Length      | Used for                                                      |
| ----------------------- | ----------- | ------------------------------------------------------------- |
| `incoming_call.mp3`     | 2–3 s loop  | `IncomingCallQuickBookingPopup` ringing                       |
| `emergency_alert.mp3`   | 1–2 s loop  | `EmergencyAssistPopup` siren                                  |
| `new_booking.mp3`       | < 1.5 s     | `NewBookingPopup` cash-register / chime                       |
| `payment_received.mp3`  | < 1 s       | Balance / deposit captured                                    |
| `urgent_action.mp3`     | < 1 s       | High-severity row arrives in `action-queue`                   |
| `callback_request.mp3`  | < 1 s       | New row in `callbacks`                                        |
| `toast_success.mp3`     | < 300 ms    | `toast.success(...)`                                          |
| `toast_error.mp3`       | < 300 ms    | `toast.error(...)`                                            |
| `toast_info.mp3`        | < 300 ms    | `toast.info(...)`                                             |
| `toast_warning.mp3`     | < 300 ms    | `toast.warning(...)`                                          |
| `status_advance.mp3`    | < 400 ms    | Booking status updated                                        |
| `sms_sent.mp3`          | < 400 ms    | Recovery / payment-link SMS sent                              |
| `note_saved.mp3`        | < 200 ms    | Internal note created                                         |
| `offline_drop.mp3`      | < 600 ms    | Connection lost                                               |
| `online_back.mp3`       | < 600 ms    | Connection restored                                           |
| `session_expired.mp3`   | < 600 ms    | Forced sign-out after token expiry                            |

Free CC0 sources: <https://pixabay.com/sound-effects/>,
<https://mixkit.co/free-sound-effects/>, <https://freesound.org/>.

The user can mute UI feedback at any time from `Settings → UI feedback
sounds`. Critical alerts remain controlled by the existing
notification preferences toggle.
