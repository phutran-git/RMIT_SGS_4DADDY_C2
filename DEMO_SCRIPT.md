# LangTrust: 2-minute demo video

Tide's suggested structure: **possibility → constraint → prototype (TideCloak's role) → what changes**.
Final file: `demo.mp4` in the repo root, **under 100 MB**, about 2:00.

## How to record (Windows 11, no extra software)

- **Record:** Snipping Tool video. Press **Win + Shift + R**, drag over the whole screen, then click **Start**. Turn the microphone on in the toolbar if you narrate live. Click **Stop** when done; it saves an `.mp4`.
- **Combine clips:** Clipchamp (preinstalled). New video → drag clips 1–3 in order → trim gaps → **Export 1080p**. That stays well under 100 MB for 2 minutes.
- Record in the temporary Edge window (the one that opened LangTrust). Pop-ups are allowed there, and the Tide approval window is a separate window, so record the **whole screen**.
- Before you start: close the red Next.js "N" badge (bottom-left) by clicking it → ✕, set browser zoom to 100–110 %, and close unrelated tabs.

## Clip 1: possibility, constraint, contributor, breach (≈ 70 s)

| Screen | Voice-over |
|---|---|
| `localhost:3000` landing page (hero) | "Vietnam has dozens of minority languages, like Khmer Krom, Hmong and Cham, that translation AI barely speaks. Their speakers hold the stories that could fix it. LangTrust lets communities pool those stories to train AI, on their own terms." |
| Scroll to *What the platform operator can see* | "They don't donate today, because they'd have to trust the platform, its admins, its cloud and every AI company forever. One admin or one breach, and their culture becomes someone else's dataset." |
| **Contribute** → *use synthetic sample* (phone number gets flagged) → **Encrypt & contribute** → ciphertext box | "A speaker writes a story. An on-device guard strips the phone number, and TideCloak encrypts it in her browser under a write-only corpus policy. The server only ever stores this." |
| **AI Lab** → badges red → **Simulate a server breach** → green "Breach contained … refused by the Tide network" | "Now imagine the operator goes rogue and hands an AI lab the whole database *and* the decryption policy. The Tide network still says no: the lab isn't approved by the community." |
| **Send request to council** | "So the lab asks the community." |

## Off camera, before clip 2
Run `bash init/role.sh grant corpus-reader` (see TEAM_RECORDING_GUIDE.md), and leave it unapproved.

## Clip 2: the council approves (≈ 20 s)

| Screen | Voice-over |
|---|---|
| LangTrust **Council** page → scroll to the lab's request (purpose visible) | "The elder council reads the purpose…" |
| TideCloak Dashboard → **QEA Approvals** → View → *Grant roles · user admin · 0/1* → **Authorize** → Tide window **Y** → **Submit** | "…and approves the grant as a change request. It's quorum-enforced: no single admin, and not the platform, can grant it alone." |

## Off camera, before clip 3
Run `bash init/role.sh grant _tide_decryptor`, then approve it in QEA Approvals off camera.

## Clip 3: the prototype pays off, and what changes (≈ 30 s)

| Screen | Voice-over |
|---|---|
| **AI Lab** → **refresh my roles** → badges green → **Open corpus (normal path)** → stories decrypt | "Now the same lab decrypts, in its own browser. The Tide network checks every single story." |
| **Build AI training pairs** → table | "And the GenAI pipeline turns the consented stories into Khmer Krom, English and Vietnamese training pairs." |
| Landing page → transparency ledger | "Communities can finally say yes to AI, because saying yes no longer means giving up control. LangTrust, built with TideCloak." |
