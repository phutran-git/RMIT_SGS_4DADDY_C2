# LangTrust: 2-minute demo video script

Record at 1080p (OBS, or Windows Game Bar Win+Alt+R). Use two browser profiles side by side:
**A = council admin**, **B = lab / contributor user**. Save as `demo.mp4` (<100 MB) in the repo root.

| Time | Screen | Voice-over |
|---|---|---|
| 0:00–0:20 | Landing page (hero) | **The possibility.** "Vietnam has dozens of minority languages, like Khmer Krom, Hmong and Cham, that translation AI barely speaks. Their speakers hold the data that could fix it: stories, proverbs, oral history. LangTrust lets communities pool those stories to train AI, on their own terms." |
| 0:20–0:40 | Same page, scroll to "What the platform operator can see" | **The constraint.** "Communities don't donate, because today they'd have to trust the platform, its admins, its cloud and every AI company it partners with, forever. One admin or one breach, and their culture becomes someone else's dataset." |
| 0:40–1:00 | Profile B → Contribute → sample Khmer Krom story with a phone number → privacy guard flags it → **Encrypt & contribute** → ciphertext shown | **The prototype.** "A speaker writes a story. An on-device guard strips the phone number. TideCloak encrypts it in her browser under a write-only corpus policy, so the server only ever stores this ciphertext." |
| 1:00–1:15 | Profile B → AI Lab → **Simulate a server breach** → red/green "Breach contained … role not found" | "Now imagine the operator goes rogue and hands an AI lab the whole database AND the decryption policy. The Tide network still refuses, because the lab hasn't been approved by the community." |
| 1:15–1:35 | B sends access request. Profile A → Council shows the request → TideCloak console: assign `corpus-reader` + `_tide_decryptor` → approve the change request in the Tide enclave | "The lab asks. The elder council reviews the purpose and approves the grant as a TideCloak change request. That is quorum-governed: no single admin, and not the platform, can grant it alone." |
| 1:35–1:50 | Profile B → refresh roles → **Open corpus** → stories decrypt → **Build AI training pairs** table | "Now the same lab decrypts, in its own browser, checked by the Tide network on every story, and the GenAI pipeline turns them into parallel training pairs." |
| 1:50–2:00 | Landing page ledger | **What changes.** "Communities can finally say yes to AI, because saying yes no longer means giving up control. LangTrust, built with TideCloak." |

## Before recording, checklist
- [ ] Council has signed the write and read policies for Khmer Krom (Council page shows both "signed").
- [ ] User B does NOT have `corpus-reader` yet, so the breach demo is refused.
- [ ] Pop-ups allowed for localhost:3000 (the Tide enclave opens as a pop-up).
- [ ] Profile B has at least one contributed story before the lab step.
