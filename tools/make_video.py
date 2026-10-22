"""Builds the LangTrust demo video: slides (real screenshots + captions) + Windows TTS narration."""
import json, subprocess, sys, wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps
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
    {"kind": "langs", "step": "1 · The possibility", "title": "The stories AI is missing",
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
     "caption": "The lab's access is a governed change request: it takes effect only when 2 council members approve.",
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


# --- bold look (matches the title cards and the new landing page) ---
DEEP, MID, GLOW = "#071c1b", "#0e3b36", "#1f7a66"
SAFFRON, CORAL, CREAM, SOFT = "#f2a93b", "#e2603f", "#fff4e2", "#cfe6de"
BLACK_F, BOLD_F = "seguibl.ttf", "segoeuib.ttf"
KHMER = IMG / "NotoSerifKhmer.ttf"


def grad_bg(inner=GLOW, mid=MID, outer=DEEP, cx=0.78, cy=0.28):
    size = int(W * 1.8)
    g = Image.radial_gradient("L").resize((size, size), Image.BILINEAR)
    x0, y0 = int(size / 2 - cx * W), int(size / 2 - cy * H)
    g = g.crop((x0, y0, x0 + W, y0 + H))
    return ImageOps.colorize(g, black=inner, mid=mid, white=outer).convert("RGB")


def strip(im):
    d = ImageDraw.Draw(im)
    stops = [(0, (242, 169, 59)), (0.5, (226, 96, 63)), (1, (31, 122, 102))]
    for x in range(W):
        t = x / (W - 1)
        (a, ca), (b, cb) = (stops[0], stops[1]) if t <= 0.5 else (stops[1], stops[2])
        k = (t - a) / (b - a)
        d.line([(x, H - 14), (x, H)], fill=tuple(int(ca[j] + (cb[j] - ca[j]) * k) for j in range(3)))


def glyph(im, size=330, xy=(W - 90, 40), alpha=60):
    if not KHMER.exists():
        return
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).text(xy, "ភាសា", font=ImageFont.truetype(str(KHMER), size), fill=(242, 169, 59, alpha), anchor="ra")
    im.paste(layer, (0, 0), layer)


def pill(d, xy, text, fnt, bg=SAFFRON, fg="#2a1a05"):
    x, y = xy
    w = d.textlength(text, font=fnt)
    d.rounded_rectangle((x, y, x + w + 44, y + 50), 25, fill=bg)
    d.text((x + 22, y + 25), text, font=fnt, fill=fg, anchor="lm")


def base(step=None, bg=None):
    im = bg or grad_bg()
    d = ImageDraw.Draw(im)
    f = font(BLACK_F, 40)
    d.text((80, 44), "Lang", font=f, fill=CREAM)
    d.text((80 + d.textlength("Lang", font=f), 44), "Trust", font=f, fill=SAFFRON)
    d.text((W - 80, 58), "Built with TideCloak", font=font(BOLD_F, 26), fill=SOFT, anchor="ra")
    if step:
        pill(d, (80, 110), step.upper(), font(BLACK_F, 24))
    strip(im)
    return im, ImageDraw.Draw(im)


def paste_shot(im, path, box):
    x0, y0, x1, y1 = box
    shot = Image.open(path).convert("RGB")
    scale = min((x1 - x0) / shot.width, (y1 - y0) / shot.height)
    shot = shot.resize((int(shot.width * scale), int(shot.height * scale)), Image.LANCZOS)
    px, py = x0 + ((x1 - x0) - shot.width) // 2, y0 + ((y1 - y0) - shot.height) // 2
    glow = Image.new("RGBA", (shot.width + 80, shot.height + 80), (0, 0, 0, 0))
    ImageDraw.Draw(glow).rounded_rectangle((40, 40, shot.width + 40, shot.height + 40), 22, fill=(242, 169, 59, 110))
    glow = glow.filter(ImageFilter.GaussianBlur(22))
    im.paste(glow, (px - 40, py - 30), glow)
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, shot.width, shot.height), 18, fill=255)
    im.paste(shot, (px, py), mask)
    ImageDraw.Draw(im).rounded_rectangle((px, py, px + shot.width, py + shot.height), 18, outline=SAFFRON, width=3)


def caption(im, d, text, bg=SAFFRON, fg="#2a1a05"):
    fnt = font(BLACK_F, 36)
    lines = wrap(d, text, fnt, W - 300)
    h = 40 + 50 * len(lines)
    d.rounded_rectangle((80, H - h - 52, W - 80, H - 52), 24, fill=bg)
    for i, ln in enumerate(lines):
        d.text((W // 2, H - h - 52 + 22 + 50 * i), ln, font=fnt, fill=fg, anchor="ma")


def tile(im, box, c1, c2, label, fg):
    x0, y0, x1, y1 = box
    g = Image.linear_gradient("L").resize((x1 - x0, y1 - y0))
    t = ImageOps.colorize(g, black=c1, white=c2).convert("RGB")
    mask = Image.new("L", t.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, t.width, t.height), 30, fill=255)
    im.paste(t, (x0, y0), mask)
    ImageDraw.Draw(im).text((x0 + 44, y1 - 50), label, font=font(BLACK_F, 64), fill=fg, anchor="ls")


def render(i, sc):
    k = sc["kind"]
    if k == "title":
        im, d = base(bg=grad_bg(cx=0.75, cy=0.35))
        glyph(im, size=280, xy=(W - 80, 20), alpha=70)
        d = ImageDraw.Draw(im)
        pill(d, (140, 250), "RMIT HACKATHON 2026 · CHALLENGE 2", font(BLACK_F, 26))
        f = font(BLACK_F, 210)
        d.text((130, 330), "Lang", font=f, fill=CREAM)
        d.text((130 + d.textlength("Lang", font=f), 330), "Trust", font=f, fill=SAFFRON)
        for j, ln in enumerate(wrap(d, "Minority-language stories train AI, and the community holds the keys.", font(BOLD_F, 46), 1300)):
            d.text((140, 610 + 62 * j), ln, font=font(BOLD_F, 46), fill=SOFT)
        d.text((140, 800), "Security × GenAI × Low-Resource Languages · built with TideCloak", font=font(BOLD_F, 32), fill=SAFFRON)
    elif k == "langs":
        im, d = base(sc["step"])
        d.text((80, 190), sc["title"], font=font(BLACK_F, 70), fill=CREAM)
        tw = (W - 160 - 2 * 40) // 3
        for j, (lab, c1, c2, fg) in enumerate([("Khmer Krom", "#e2603f", "#b8371f", CREAM), ("Hmong", "#f7c04a", "#e89a1c", "#2a1a05"), ("Cham", "#2e8f78", "#12524a", CREAM)]):
            tile(im, (80 + j * (tw + 40), 330, 80 + j * (tw + 40) + tw, 700), c1, c2, lab, fg)
        d = ImageDraw.Draw(im)
        caption(im, d, sc["caption"])
    elif k == "shotlog":
        im, d = base(sc["step"], bg=grad_bg(inner="#c2482b", mid="#6e1b0e", outer="#2a0c07", cx=0.2, cy=0.2))
        paste_shot(im, IMG / sc["img"], (100, 190, 1060, 820))
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((1100, 190, W - 80, 820), 24, fill="#12090a", outline=CORAL, width=3)
        d.text((1130, 215), "Tide network response (real output, live run):", font=font(BLACK_F, 28), fill="#ffb59c")
        y = 272
        for ln in REFUSAL:
            for part in wrap(d, ln, font(MONO, 23), W - 80 - 1130 - 30):
                d.text((1130, y), part, font=font(MONO, 23), fill="#ffd9a8" if not ln.startswith("TIDE") else "#ff8a65"); y += 32
            y += 8
        caption(im, d, sc["caption"], bg=CREAM, fg="#6e1b0e")
    elif k == "shot":
        im, d = base(sc["step"])
        paste_shot(im, IMG / sc["img"], (140, 190, W - 140, 820))
        d = ImageDraw.Draw(im)
        caption(im, d, sc["caption"])
    else:
        constraint = sc["step"].startswith("2")
        bg = grad_bg(inner="#5a2316", mid="#2a1210", outer="#120a0a", cx=0.15, cy=0.85) if constraint else grad_bg(cx=0.2, cy=0.25)
        im, d = base(sc["step"], bg=bg)
        if sc["step"].startswith("4"):
            glyph(im, size=300, xy=(W - 80, 150), alpha=50)
            d = ImageDraw.Draw(im)
        accent = CORAL if constraint else SAFFRON
        y = 200
        for ln in wrap(d, sc["title"], font(BLACK_F, 74), W - 220):
            d.text((80, y), ln, font=font(BLACK_F, 74), fill=CREAM); y += 88
        y += 40
        for b in sc["bullets"]:
            lines = wrap(d, b, font(BOLD_F, 42), W - 300)
            d.rounded_rectangle((86, y + 14, 112, y + 40), 8, fill=accent)
            for ln in lines:
                d.text((140, y), ln, font=font(BOLD_F, 42), fill=SOFT); y += 58
            y += 28
        if k == "cipher":
            d.rounded_rectangle((80, y + 10, W - 80, min(H - 60, y + 320)), 24, fill="#04100f", outline=SAFFRON, width=3)
            d.text((110, y + 35), "What the server stored (real output from our test run):", font=font(BLACK_F, 30), fill=SAFFRON)
            cy = y + 92
            for ln in wrap(d, " ".join(CIPHER[k2:k2 + 80] for k2 in range(0, len(CIPHER), 80)), font(MONO, 30), W - 240):
                if cy > H - 110: break
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
