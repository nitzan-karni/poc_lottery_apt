"""
Generate synthetic Israeli ID card images and מלג"ם eligibility certificate images
for testing the AI document verification pipeline.

Run: python tests/generate_test_docs.py
Output: tests/fixtures/images/
"""
import os
import json
import textwrap
from datetime import date
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = Path(__file__).parent / "fixtures" / "images"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Try to get a system font, fall back to default
def get_font(size=16, bold=False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf" if bold else "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_israeli_id_card(candidate: dict) -> Image.Image:
    """
    Generate a synthetic Israeli Teudat Zehut (ID card) image.
    Modeled after the Israeli biometric ID card layout.
    """
    W, H = 856, 540  # Standard ID card proportions (CR80 @ 100dpi)
    img = Image.new("RGB", (W, H), color=(245, 245, 240))
    draw = ImageDraw.Draw(img)

    # Background gradient effect
    for y in range(H):
        r = int(220 + (245 - 220) * y / H)
        g = int(235 + (245 - 235) * y / H)
        b = int(240 + (245 - 240) * y / H)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Top header bar — blue (Israeli government color)
    draw.rectangle([0, 0, W, 80], fill=(0, 70, 150))

    # Israeli state emblem placeholder (menorah shape)
    draw.ellipse([18, 8, 72, 72], fill=(255, 255, 255), outline=(200, 200, 200))
    draw.text((45, 40), "✡", font=get_font(28, bold=True), fill=(0, 70, 150), anchor="mm")

    # Header text
    draw.text((90, 12), "מדינת ישראל", font=get_font(22, bold=True), fill=(255, 255, 255))
    draw.text((90, 38), "State of Israel", font=get_font(16), fill=(220, 230, 255))
    draw.text((90, 58), "تعودت إسرائيل", font=get_font(14), fill=(200, 220, 255))

    # Card title
    draw.text((W - 20, 12), "תעודת זהות", font=get_font(20, bold=True), fill=(255, 255, 255), anchor="ra")
    draw.text((W - 20, 38), "Identity Card", font=get_font(14), fill=(220, 230, 255), anchor="ra")

    # Photo placeholder
    draw.rectangle([30, 100, 190, 260], fill=(200, 210, 220), outline=(100, 120, 140), width=2)
    draw.text((110, 180), "תמונה\nPhoto", font=get_font(14), fill=(80, 100, 120), anchor="mm", align="center")

    # Biometric strip
    draw.rectangle([30, 270, 190, 310], fill=(240, 240, 255), outline=(100, 120, 200), width=1)
    draw.text((110, 290), "<<<<<<<<<<<<<<<<<<<<<", font=get_font(10), fill=(60, 60, 180), anchor="mm")

    # Data fields — right side
    fields = [
        ("שם משפחה / Last Name", candidate["last_name"]),
        ("שם פרטי / First Name", candidate["first_name"]),
        ("מספר זהות / ID Number", candidate["id_number"]),
        ("תאריך לידה / Date of Birth", candidate.get("dob", "01/01/1990")),
        ("מין / Sex", "זכר / M" if candidate.get("gender", "M") == "M" else "נקבה / F"),
        ("לאום / Nationality", "ישראלי / Israeli"),
        ("תוקף / Expiry", "01/01/2035"),
    ]

    y = 95
    for label, value in fields:
        draw.text((W - 20, y), label, font=get_font(11), fill=(100, 120, 140), anchor="ra")
        draw.text((W - 20, y + 16), value, font=get_font(15, bold=True), fill=(20, 40, 80), anchor="ra")
        draw.line([(210, y + 34), (W - 20, y + 34)], fill=(200, 210, 220), width=1)
        y += 40

    # MRZ (Machine Readable Zone) at bottom
    draw.rectangle([0, H - 70, W, H], fill=(240, 240, 245))
    draw.line([(0, H - 70), (W, H - 70)], fill=(180, 190, 200), width=1)
    first_trunc = candidate["first_name"][:9].upper().ljust(9, "<")
    last_trunc = candidate["last_name"][:14].upper().ljust(14, "<")
    id_trunc = candidate["id_number"].ljust(9, "<")
    mrz1 = f"IDISRAEL{last_trunc}<<{first_trunc}"
    mrz2 = f"{id_trunc}ISR9001011M3501010<<<<<<<<<<<<<<<6"
    draw.text((20, H - 62), mrz1[:44], font=get_font(14), fill=(60, 60, 120))
    draw.text((20, H - 42), mrz2[:44], font=get_font(14), fill=(60, 60, 120))

    # Security pattern (light watermark lines)
    for x in range(0, W, 30):
        draw.line([(x, 85), (x + 15, H - 75)], fill=(220, 225, 235), width=1)

    return img


def draw_malgam_certificate(candidate: dict, cert: dict) -> Image.Image:
    """
    Generate a synthetic מלג"ם eligibility certificate image.
    מלג"ם = המרכז לבחינת זכאות לדיור בהישג יד
    """
    W, H = 794, 1123  # A4 @ 96dpi
    img = Image.new("RGB", (W, H), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Page border
    draw.rectangle([20, 20, W - 20, H - 20], outline=(0, 100, 130), width=2)
    draw.rectangle([24, 24, W - 24, H - 24], outline=(0, 131, 143), width=1)

    # Header background
    draw.rectangle([20, 20, W - 20, 160], fill=(0, 100, 130))

    # Header text — RTL Hebrew
    draw.text((W // 2, 50), "מלג\"ם", font=get_font(32, bold=True), fill=(255, 255, 255), anchor="mm")
    draw.text((W // 2, 85), "המרכז לבחינת זכאות לדיור בהישג יד", font=get_font(18, bold=True), fill=(200, 240, 255), anchor="mm")
    draw.text((W // 2, 112), "National Center for Affordable Housing Eligibility", font=get_font(13), fill=(180, 220, 245), anchor="mm")
    draw.text((W // 2, 135), "מינהל הדיור הממשלתי | Ministry of Construction and Housing", font=get_font(11), fill=(160, 210, 240), anchor="mm")

    # Certificate title
    draw.rectangle([60, 175, W - 60, 225], fill=(0, 131, 143), outline=(0, 100, 130), width=1)
    draw.text((W // 2, 200), "אישור זכאות לדיור בהישג יד", font=get_font(22, bold=True), fill=(255, 255, 255), anchor="mm")

    # Certificate number & date
    draw.text((W - 60, 245), f"מספר אישור: {cert['certificate_number']}", font=get_font(13), fill=(50, 50, 50), anchor="ra")
    draw.text((W - 60, 265), f"תאריך הנפקה: {cert['issue_date']}", font=get_font(13), fill=(50, 50, 50), anchor="ra")
    draw.text((W - 60, 285), f"בתוקף עד: {cert['valid_until']}", font=get_font(13, bold=True), fill=(0, 100, 130), anchor="ra")
    draw.text((60, 245), f"Date of Issue: {cert['issue_date']}", font=get_font(12), fill=(100, 100, 100))

    # Divider
    draw.line([(60, 305), (W - 60, 305)], fill=(0, 131, 143), width=2)

    # Main body
    draw.text((W - 60, 330), "לכבוד:", font=get_font(15, bold=True), fill=(30, 30, 30), anchor="ra")
    draw.text((W - 60, 355), f"{candidate['first_name']} {candidate['last_name']}", font=get_font(20, bold=True), fill=(0, 70, 120), anchor="ra")
    draw.text((W - 60, 382), f"ת.ז. / I.D.: {candidate['id_number']}", font=get_font(16), fill=(50, 50, 50), anchor="ra")

    draw.line([(60, 410), (W - 60, 410)], fill=(200, 210, 220), width=1)

    # Certificate text
    cert_text = [
        "הננו מאשרים בזאת כי המבקש/ת הנ\"ל עמד/ה בכל התנאים הנדרשים",
        "לקבלת אישור זכאות לדיור בהישג יד בהתאם לתקנות הדיור הציבורי.",
        "",
        f"המבקש/ת הינו/ה חסר/ת דירה (חסר/ת זכויות בדירה)",
        "כמשמעותו בחוק הדיור הציבורי (זכויות רכישה), התשנ\"ד-1994.",
        "",
        "אישור זה מהווה תנאי הכרחי להשתתפות בהגרלות דיור בהישג יד",
        "המתנהלות על ידי רשויות מקומיות ו/או עמיתן.",
    ]
    y = 430
    for line in cert_text:
        if line:
            draw.text((W - 60, y), line, font=get_font(13), fill=(40, 40, 40), anchor="ra")
        y += 24

    # English translation box
    draw.rectangle([60, y + 10, W - 60, y + 110], fill=(240, 248, 250), outline=(0, 131, 143), width=1)
    draw.text((80, y + 20), "CERTIFICATION (English)", font=get_font(12, bold=True), fill=(0, 100, 130))
    eng_text = (
        f"This certifies that {candidate['first_name']} {candidate['last_name']} (ID: {candidate['id_number']}) "
        f"meets all eligibility requirements for affordable housing assistance and is confirmed to be "
        f"APARTMENT-FREE (חסר/ת דירה) as defined under Israeli housing regulations."
    )
    wrapped = textwrap.wrap(eng_text, width=85)
    ey = y + 38
    for wline in wrapped[:3]:
        draw.text((80, ey), wline, font=get_font(11), fill=(60, 60, 60))
        ey += 18

    y = y + 130

    # Signature area
    draw.line([(60, y), (W - 60, y)], fill=(200, 210, 220), width=1)
    y += 20

    # Left signature
    draw.line([(80, y + 60), (280, y + 60)], fill=(60, 60, 60), width=1)
    draw.text((180, y + 68), "חתימת המנהל הכללי", font=get_font(11), fill=(80, 80, 80), anchor="mm")
    draw.text((180, y + 82), "Director General Signature", font=get_font(10), fill=(120, 120, 120), anchor="mm")

    # Right signature
    draw.line([(W - 280, y + 60), (W - 80, y + 60)], fill=(60, 60, 60), width=1)
    draw.text((W - 180, y + 68), "חותמת מלג\"ם", font=get_font(11), fill=(80, 80, 80), anchor="mm")
    draw.text((W - 180, y + 82), "Official Stamp", font=get_font(10), fill=(120, 120, 120), anchor="mm")

    # Official STAMP (circular)
    stamp_cx, stamp_cy = W - 200, y + 30
    draw.ellipse([stamp_cx - 55, stamp_cy - 55, stamp_cx + 55, stamp_cy + 55],
                 outline=(0, 100, 130), width=3)
    draw.ellipse([stamp_cx - 48, stamp_cy - 48, stamp_cx + 48, stamp_cy + 48],
                 outline=(0, 131, 143), width=1)
    draw.text((stamp_cx, stamp_cy - 20), "מלג\"ם", font=get_font(14, bold=True), fill=(0, 100, 130), anchor="mm")
    draw.text((stamp_cx, stamp_cy), "OFFICIAL", font=get_font(10, bold=True), fill=(0, 100, 130), anchor="mm")
    draw.text((stamp_cx, stamp_cy + 16), "STAMP", font=get_font(10, bold=True), fill=(0, 100, 130), anchor="mm")

    # QR code placeholder
    draw.rectangle([80, y, 170, y + 90], fill=(240, 240, 240), outline=(100, 100, 100), width=1)
    # Draw QR-like pattern
    for qi in range(3):
        for qj in range(3):
            draw.rectangle([90 + qi * 25, y + 10 + qj * 25, 108 + qi * 25, y + 28 + qj * 25],
                          fill=(30, 30, 30) if (qi + qj) % 2 == 0 else (200, 200, 200))
    draw.text((125, y + 98), f"קוד: {cert['certificate_number'][:12]}", font=get_font(9), fill=(100, 100, 100), anchor="mm")

    # Footer
    draw.rectangle([20, H - 70, W - 20, H - 20], fill=(240, 248, 250))
    draw.line([(20, H - 70), (W - 20, H - 70)], fill=(0, 131, 143), width=1)
    draw.text((W // 2, H - 55), "מלג\"ם — ת.ד. 18110, ירושלים 9118001  |  טל': 02-5001111  |  www.malgam.gov.il", font=get_font(10), fill=(80, 80, 80), anchor="mm")
    draw.text((W // 2, H - 35), f"מסמך זה הופק ב-{cert['issue_date']} ומספרו הסידורי: {cert['certificate_number']}", font=get_font(10), fill=(100, 100, 100), anchor="mm")

    return img


def generate_all():
    with open(Path(__file__).parent / "fixtures" / "synthetic_candidates.json") as f:
        data = json.load(f)

    generated = []
    for candidate in data["candidates"]:
        name_slug = f"{candidate['first_name'].lower()}_{candidate['last_name'].lower()}"
        cert = candidate["eligibility_certificate"]

        # Generate ID card
        id_path = OUTPUT_DIR / f"id_card_{name_slug}.png"
        id_img = draw_israeli_id_card(candidate)
        id_img.save(id_path, "PNG", dpi=(150, 150))
        print(f"✅ ID card:     {id_path.name}")

        # Generate eligibility certificate
        cert_path = OUTPUT_DIR / f"eligibility_cert_{name_slug}.png"
        cert_img = draw_malgam_certificate(candidate, cert)
        cert_img.save(cert_path, "PNG", dpi=(150, 150))
        print(f"✅ Certificate: {cert_path.name}")

        generated.append({
            "candidate": f"{candidate['first_name']} {candidate['last_name']}",
            "id_number": candidate["id_number"],
            "id_card_image": str(id_path),
            "eligibility_cert_image": str(cert_path),
        })

    # Also generate negative test cases
    for tc in data.get("invalid_test_cases", []):
        name_slug = f"{tc['first_name'].lower()}_{tc['last_name'].lower()}_INVALID"
        cert = tc["eligibility_certificate"]

        id_path = OUTPUT_DIR / f"id_card_{name_slug}.png"
        id_img = draw_israeli_id_card(tc)
        id_img.save(id_path, "PNG")
        print(f"⚠️  Invalid ID:  {id_path.name}")

        cert_path = OUTPUT_DIR / f"eligibility_cert_{name_slug}.png"
        # For expired cert, modify valid_until display
        cert_img = draw_malgam_certificate(tc, cert)
        cert_img.save(cert_path, "PNG")
        print(f"⚠️  Invalid cert: {cert_path.name}")

    print(f"\n✅ Generated {len(generated) * 2 + len(data.get('invalid_test_cases', [])) * 2} images in {OUTPUT_DIR}")
    return generated


if __name__ == "__main__":
    generate_all()
