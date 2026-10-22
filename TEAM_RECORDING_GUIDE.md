# Team guide: recording the LangTrust demo video

Record on **the ASUS laptop**: TideCloak, the app and the council's Tide account all live there.
Goal: `demo.mp4` (about 2 min, **under 100 MB**) saved in this `langtrust` folder. Voice-over text is in [DEMO_SCRIPT.md](DEMO_SCRIPT.md).

---

## 0. Check everything is running (2 min)

1. **Docker Desktop** is open, and the container `mytidecloak` is running (green). If it's stopped, press ▶ in Docker Desktop.
   **Never delete that container**: it holds the realm and the council account.
2. **The app** is running. Open a terminal in this `langtrust` folder and check that `http://localhost:3000` loads. If it doesn't, run:
   ```
   npm run dev
   ```
3. **Use the temporary Edge window** where LangTrust is already signed in as `admin`. If it's closed, run this from the `langtrust` folder:
   ```
   powershell -ExecutionPolicy Bypass -File init\open-app-edge.ps1
   ```
   Then click **Sign in with Tide** and sign in with the council's Tide account (the account owner types the password).
   Use that window only: it allows Tide's pop-ups and localhost calls. A normal Edge/Chrome window gives "Network request failed".
4. **Reset the demo data and roles** (Git Bash, in the `langtrust` folder):
   ```
   bash init/reset-demo.sh
   bash init/role.sh status
   ```
   `status` must show `Roles of 'admin' now: []` and `Pending change requests: []`. Then press **F5** in LangTrust.
   If the roles aren't empty, see "Undo after a take" below.

## 1. Recording tools (built into Windows 11)

- **Snipping Tool video:** press **Win + Shift + R**, drag over the **whole screen**, switch the mic on in the toolbar (to narrate live), then click **Start**. Click **Stop** when done; it saves an `.mp4`.
- **Clipchamp:** joins the clips. New video → drag the clips in order → trim → **Export → 1080p**.
- Before recording: click the black **N** badge (bottom-left of the app) → hide it, set zoom to 100–110 %, and close unrelated tabs and notifications.

## 2. Clip 1: possibility, constraint, contributor, breach (≈ 70 s)

1. Landing page `localhost:3000`, then scroll a little ("What the platform operator can see").
2. **Contribute** → **use synthetic sample** (the blue box flags the phone number) → **Encrypt & contribute** → the ciphertext box appears.
3. **AI Lab** → both badges are **red** → **Simulate a server breach** → green **"Breach contained … Refused by the Tide network"**.
4. **Send request to council**. **Stop** recording.

## 3. Between clips: file grant 1 (off camera)

In Git Bash (in the `langtrust` folder):
```
bash init/role.sh grant corpus-reader
```
It prints `Filed: grant 'corpus-reader'…`. **Don't approve it yet**: the approval is clip 2.

## 4. Clip 2: the council approves (≈ 20 s)

1. **Start** recording. LangTrust → **Council** → scroll to *Access requests from AI labs* (the Mekong NLP Lab purpose is visible).
2. Switch to the **TideCloak Dashboard** tab (`localhost:8080/realms/langtrust/tide-console/`) → **QEA Approvals** → **F5** → **View** on "Grant roles · user admin · 0/1".
3. **Authorize** → the **Tide** window opens → **Y** → **Submit Approvals**. **Stop** recording.

## 5. Between clips: grant 2 (off camera)

```
bash init/role.sh grant _tide_decryptor
```
Then approve it in **QEA Approvals** the same way (View → Authorize → Y → Submit), off camera. Check:
```
bash init/role.sh status
```
This should show `["corpus-reader","_tide_decryptor"]`.

## 6. Clip 3: the payoff (≈ 30 s)

1. **Start** recording. **AI Lab** → **refresh my roles** → both badges **green** (if they're not green, click **Log out** and sign in again).
2. **Open corpus (normal path)** → the story appears in plain text.
3. **Build AI training pairs** → the Khmer Krom / English / Tiếng Việt table.
4. Go to the landing page (click **LangTrust**) and scroll to the transparency ledger. Closing line. **Stop**.

## 7. Finish

1. Combine clips 1–3 in Clipchamp → export 1080p → save as **`demo.mp4`** in this `langtrust` folder (under 100 MB).
2. Tell Claude: "demo.mp4 is saved". Claude commits and pushes it to the GitHub repo.

---

## Undo after a take (to record again)

Revoke the roles one at a time and approve each in QEA Approvals:
```
bash init/role.sh revoke _tide_decryptor
bash init/role.sh revoke corpus-reader
bash init/reset-demo.sh
```

## If something breaks

| Symptom | Fix |
|---|---|
| "Waiting for enclave…" forever / no Tide window | Allow pop-ups for `localhost:3000` and `localhost:8080` (`edge://settings/content/popups`), press F5, click again |
| "Network request failed" on a Tide page | You're in a normal browser window: use `init\open-app-edge.ps1` |
| `Could not reach enough VVK ORKs` while you **are** approved | Tide's servers are flaky: wait 30 s and retry |
| `role.sh` says a request is already pending | Approve or deny it in QEA Approvals first |
| Badges still red after the approval | **Log out**, then sign in again |
