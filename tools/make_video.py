"""Builds the LangTrust demo video: slides (real screenshots + captions) + Windows TTS narration."""
import json, subprocess, sys, wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import imageio_ffmpeg

HERE = Path(__file__).parent  # screenshots go in tools/img; needs: pip install pillow imageio-ffmpeg; Windows TTS voice "Zira"
IMG = HERE / "img"
OUT = HERE / "build"
OUT.mkdir(exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
W, H = 1920, 1080

PAPER, CARD, INK, MUTED = "#f6f1e7", "#fffdf8", "#1d2a2a", "#5b6b68"
TEAL, CLAY, LINE = "#0f5c57", "#b5532f", "#e2d9c6"
F = "C:/Windows/Fonts/"
def font(name, size): return ImageFont.truetype(F + name, size)
SERIF_B, SERIF, SANS, SANS_B, MONO = "georgiab.ttf", "georgia.ttf", "segoeui.ttf", "segoeuib.ttf", "consola.ttf"

CIPHER = ("AQAAAAEAAAACMQEAAFH15xQ5fp4YNTWN4s/XvmoFX7WMaYktITuQOdNvw463/e/tadWnB//HO2FYp6LCcukrEJmuJvM1Hk7gr8a"
          "ByrT84RoIUM+zO5VE8TzbsXu6FanvPZJiUKor+raafW74mjmkGBl3RB9ptca07w0ggoJtl7/SViWbkzERMBr4bus0ynWIW9orD6IXQ"
          "LVHQbhsd6NvYBbpr2j6LYN6xbh8zCa74HhO7WYdv/ChemNchu4kr92wUdAb48qVubpVWZ/uoznInYta7Si3dJtDnFRz0KXPguSAllvAD")

REFUSAL = [
    "TIDE-TIDEJS-NET-THRESHOLD_FAILURE: got 0 of 14 required, 19 of 20 failed",
    "ork18 [TIDE-ORK] '_tide_decryptor' role not found for this decryption request.",
    "ork16 [TIDE-ORK] '_tide_decryptor' role not found for this decryption request.",
    "ork19 [TIDE-ORK] '_tide_decryptor' role not found for this decryption request.",
    "ork7  [TIDE-ORK] '_tide_decryptor' role not found ...",
    "... 15 more nodes: same refusal",
]

SCENES = [
    {"kind": "title",
     "say": "LangTrust. A community language data trust, built with TideCloak."},
    {"kind": "shot", "img": "landing.jpg", "step": "1 · The possibility",
     "caption": "Minority-language communities pool their stories to train translation AI, on their own terms.",
     "say": "Vietnam has dozens of minority languages, like Khmer Krom, Hmong and Cham, that translation AI barely speaks. "
            "Their speakers hold the stories that could fix that. LangTrust lets communities pool those stories to train AI, on their own terms."},
    {"kind": "text", "step": "2 · The constraint", "title": "Sharing today means trusting someone forever",
     "bullets": ["Donating data means trusting the platform, its admins, its cloud and every future AI partner.",
                 "One rogue admin or one breach, and a community's culture becomes someone else's dataset.",
                 "So communities don't share, and translation AI never reaches their clinics, courts and schools."],
     "say": "But communities don't donate. Today, sharing means trusting the platform, its admins, its cloud, and every future AI partner, forever. "
            "One rogue admin or one breach, and their culture becomes someone else's dataset."},
    {"kind": "shot", "img": "council.png", "step": "3 · The prototype: the council sets the rules",
     "caption": "Two policies per corpus, signed by the Tide network: contributors can only write; approved labs can only read.",
     "say": "In LangTrust, the community's elder council sets the rules. Each corpus gets two policies, signed by the Tide network. "
            "Contributors may only write, and only approved readers may decrypt."},
    {"kind": "shot", "img": "enclave.png", "step": "3 · The prototype: approval in the Tide enclave",
     "caption": "Approvals happen in Tide's enclave, not in our app. No server holds a master key.",
     "say": "Every approval happens in the Tide enclave, not in our app. No server holds a master key."},
    {"kind": "cipher", "step": "3 · The prototype: a speaker contributes",
     "title": "Encrypted in her browser. The server stores only this.",
     "bullets": ["On-device privacy guard removed her phone number before encryption.",
                 "TideCloak encrypted the story under the corpus's write-only policy."],
     "say": "A speaker shares a story. An on-device guard strips her phone number, and TideCloak encrypts it in her browser. "
            "The server only ever stores this ciphertext."},
    {"kind": "shotlog", "img": "lab_red.png", "step": "3 · The prototype: a server breach",
     "caption": "The operator leaks the database AND the decryption policy. The Tide network still refuses.",
     "say": "Now imagine the operator goes rogue, and hands an AI lab the entire database and the decryption policy. "
            "The Tide network still refuses. Nineteen of twenty nodes said no, because the community never approved this lab."},
    {"kind": "shot", "img": "qea.png", "step": "3 · The prototype: the community decides",
     "caption": "The lab's access is a TideCloak change request: 0 of 1 approvals until the council signs it.",
     "say": "So the lab asks. The council reviews its purpose, and grants access as a change request. "
            "It is quorum-enforced. No single admin, and not the platform, can approve it alone."},
    {"kind": "shot", "img": "decrypted.png", "step": "3 · The prototype: approved access",
     "caption": "After approval, the lab decrypts in its own browser; the Tide network checks every story.",
     "say": "Once approved, the same lab decrypts, in its own browser, with the Tide network checking every single story."},
    {"kind": "shot", "img": "pairs.png", "step": "3 · The prototype: GenAI",
     "caption": "The GenAI pipeline turns consented stories into Khmer Krom, English and Vietnamese training pairs.",
     "say": "Then the GenAI pipeline turns the consented stories into Khmer Krom, English and Vietnamese training pairs for a translation model."},
    {"kind": "text", "step": "4 · What changes", "title": "Communities can say yes to AI, and keep control",
     "bullets": ["Speakers keep consent: they choose the use, and can withdraw.",
                 "The council keeps authority: access needs their approval in the Tide enclave.",
                 "No platform, admin or AI can override it, not even with a breach."],
     "say": "What changes? Communities can finally say yes to AI, because saying yes no longer means giving up control. "
            "No platform, admin or AI can override the community. LangTrust, built with TideCloak."},
]


def wrap(draw, text, fnt, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=fnt) <= width:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines


def base(step=None):
    im = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(im)
    d.text((80, 50), "Lang", font=font(SERIF_B, 40), fill=TEAL)
    d.text((80 + d.textlength("Lang", font=font(SERIF_B, 40)), 50), "Trust", font=font(SERIF_B, 40), fill=CLAY)
    d.text((W - 80, 62), "Built with TideCloak", font=font(SANS, 26), fill=MUTED, anchor="ra")
    if step:
        d.text((80, 112), step.upper(), font=font(SANS_B, 26), fill=CLAY)
    return im, d


def paste_shot(im, path, box):
    x0, y0, x1, y1 = box
    shot = Image.open(path).convert("RGB")
    scale = min((x1 - x0) / shot.width, (y1 - y0) / shot.height)
    shot = shot.resize((int(shot.width * scale), int(shot.height * scale)), Image.LANCZOS)
    px, py = x0 + ((x1 - x0) - shot.width) // 2, y0 + ((y1 - y0) - shot.height) // 2
    shadow = Image.new("RGBA", (shot.width + 40, shot.height + 40), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((20, 20, shot.width + 20, shot.height + 20), 18, fill=(0, 0, 0, 60))
    im.paste(shadow.filter(ImageFilter.GaussianBlur(12)), (px - 20, py - 12), shadow.filter(ImageFilter.GaussianBlur(12)))
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, shot.width, shot.height), 14, fill=255)
    im.paste(shot, (px, py), mask)
    ImageDraw.Draw(im).rounded_rectangle((px, py, px + shot.width, py + shot.height), 14, outline=LINE, width=2)


def caption(im, d, text):
    fnt = font(SANS_B, 36)
    lines = wrap(d, text, fnt, W - 260)
    h = 40 + 50 * len(lines)
    d.rounded_rectangle((80, H - h - 50, W - 80, H - 50), 20, fill=TEAL)
    for i, ln in enumerate(lines):
        d.text((W // 2, H - h - 50 + 22 + 50 * i), ln, font=fnt, fill="white", anchor="ma")


def render(i, sc):
    if sc["kind"] == "title":
        im, d = base()
        d.text((W // 2, 380), "LangTrust", font=font(SERIF_B, 150), fill=TEAL, anchor="mm")
        d.text((W // 2, 520), "A community language data trust", font=font(SERIF, 56), fill=INK, anchor="mm")
        d.text((W // 2, 600), "Minority-language stories train AI, and the community holds the keys", font=font(SANS, 38), fill=MUTED, anchor="mm")
        d.rounded_rectangle((W // 2 - 360, 700, W // 2 + 360, 780), 40, fill=CLAY)
        d.text((W // 2, 740), "Security × GenAI × Low-Resource Languages", font=font(SANS_B, 32), fill="white", anchor="mm")
        d.text((W // 2, 900), "RMIT Hackathon 2026 · Challenge 2 (UNLOCKED) · built with TideCloak", font=font(SANS, 30), fill=MUTED, anchor="mm")
    elif sc["kind"] == "shotlog":
        im, d = base(sc["step"])
        paste_shot(im, IMG / sc["img"], (100, 190, 1060, 830))
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((1100, 190, W - 80, 830), 20, fill="#1d2a2a")
        d.text((1130, 215), "Tide network response (real output):", font=font(SANS_B, 28), fill="#f6b8a4")
        y = 270
        for ln in REFUSAL:
            for part in wrap(d, ln, font(MONO, 23), W - 80 - 1130 - 30):
                d.text((1130, y), part, font=font(MONO, 23), fill="#9fd8cf" if not ln.startswith("TIDE") else "#f6b8a4"); y += 32
            y += 8
        caption(im, d, sc["caption"])
    elif sc["kind"] == "shot":
        im, d = base(sc["step"])
        paste_shot(im, IMG / sc["img"], (120, 170, W - 120, 830))
        d = ImageDraw.Draw(im)
        caption(im, d, sc["caption"])
    else:
        im, d = base(sc["step"])
        d.text((80, 180), sc["title"], font=font(SERIF_B, 58), fill=INK)
        y = 320
        for b in sc["bullets"]:
            lines = wrap(d, b, font(SANS, 42), W - 300)
            d.ellipse((90, y + 16, 110, y + 36), fill=CLAY)
            for ln in lines:
                d.text((140, y), ln, font=font(SANS, 42), fill=INK); y += 58
            y += 30
        if sc["kind"] == "cipher":
            d.rounded_rectangle((80, y + 20, W - 80, y + 330), 20, fill="#1d2a2a")
            d.text((110, y + 45), "What the server stored (real output from our test run):", font=font(SANS_B, 30), fill="#9fd8cf")
            cy = y + 100
            for ln in wrap(d, " ".join(CIPHER[k:k + 80] for k in range(0, len(CIPHER), 80)), font(MONO, 30), W - 240):
                if cy > H - 140: break
                d.text((110, cy), ln, font=font(MONO, 30), fill="#9fd8cf"); cy += 42
    p = OUT / f"s{i:02d}.png"
    im.save(p)
    return p


def tts(i, text):
    wav = OUT / f"s{i:02d}.wav"
    ps = ("Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
          "$s.SelectVoice('Microsoft Zira Desktop'); $s.Rate = 2; "
          f"$s.SetOutputToWaveFile('{wav}'); $s.Speak([Console]::In.ReadToEnd()); $s.Dispose()")
    subprocess.run(["powershell", "-NoProfile", "-Command", ps], input=text, text=True, check=True)
    with wave.open(str(wav)) as w:
        return wav, w.getnframes() / w.getframerate()


def main():
    parts, total = [], 0.0
    for i, sc in enumerate(SCENES):
        png = render(i, sc)
        wav, dur = tts(i, sc["say"])
        seg = OUT / f"s{i:02d}.mp4"
        length = dur + 0.5
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-loop", "1", "-i", str(png), "-i", str(wav),
                        "-af", "apad", "-t", f"{length:.2f}", "-r", "30",
                        "-vf", "fade=t=in:st=0:d=0.3,format=yuv420p",
                        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-tune", "stillimage",
                        "-c:a", "aac", "-b:a", "128k", "-ar", "44100", str(seg)], check=True)
        parts.append(seg); total += length
        print(f"scene {i:02d}: {length:5.1f}s  ({sc.get('step', 'title')})", flush=True)
    lst = OUT / "list.txt"
    lst.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts))
    final = HERE / "demo.mp4"
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy",
                    "-movflags", "+faststart", str(final)], check=True)
    print(f"TOTAL {total:.1f}s -> {final} ({final.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
