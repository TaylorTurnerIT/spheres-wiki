#!/usr/bin/env python3
"""Download missing cover images from legacy DriveThruRPG product pages."""

import json
import os
import re
import subprocess
import urllib.request

COOKIE = (
    "cf_clearance=8vVFpZzvK3gOx3Z1Z6rGCs7rs8hb7kRue3Q.fxfb50Q-1781551317-1.2.1.1-grvYzDP_Ln6orL0qd_sWWsmko4az0CbLHMMb03tBe1HtUbHkdYhL_UwJ8nrEQgl2EsnS74MEI7SySOYDlA0w0pz5OzWieL8ZOmOw5lBe7L7ozKtCCzNhz9L_hN.QILBHJgPMxQ4eg0kBuxzYDTzkYj6VYhQ4c26Nv90OtVVpB6sMoBt7gIUG0cjRrOsgRgkUDNKAsIVWb15c67gPJxaiNHGz6dvnfZ1tQO4iUAz58bKubLyVeXoBmn0D3kTXMqmW_hmn2hAWnRYhxgxKln3iSZXF3Tde_OPUbhI1.EFt33kzv.NXzTh9Rm0wndpwz8ek2zDDTGrZcBBLyA7dmjTxTuLR2VAEgI7uxSFzwk.o6rkw9X8HFGL5XXCsTuDbSiBr8QH0ZHlLqPOfs4B2DM9tWNncu8YVV2X15rFwN_72GhQ;"
    "site_visits=18; last_visit=2026-06-15%2014%3A32%3A27;"
    "phnx_auth_refresh_timer=1784143400;"
    "email_address=taylorturnerit%40gmail.com;"
    "password=%242y%2410%24bS%2F5oEfIVsOh9ptgGAN5keS7RPalhCqKUPlnEKxynuAHtf0Tj17qO;"
    "affiliate_referrer=549120;"
    "cid=oOZ2UYOr4kcjpq%2BitrnOtCwUQcHMYdEEEAfJyW7z8XkSYcym4FWV5AFI5gsOqMVPWKOy5jfprCQ%3D;"
    "r20v=1;"
    "affiliate_referrer_phnx=549120;"
    'siteSettings={"darkMode":"true","hideOwnedTitleMode":null};'
    "phnx_auth_cookie_hp=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3ODE1NTEzMTcsImV4cCI6MTc4MTU3MjkxNywicm9sZXMiOlsiUk9MRV9DVVNUT01FUiJdLCJlbWFpbCI6InRheWxvcnR1cm5lcml0QGdtYWlsLmNvbSIsInByZXZpb3VzTG9naW4iOnsiZGF0ZSI6IjIwMjYtMDYtMTIgMTA6MzY6NDIuMDAwMDAwIiwidGltZXpvbmVfdHlwZSI6MywidGltZXpvbmUiOiJVUy9DZW50cmFsIn0sInVzZXJuYW1lIjoidGF5bG9ydHVybmVyaXRAZ21haWwuY29tIiwic2l0ZUlkIjoxMCwiZ3JvdXBJZCI6MSwibmFtZSI6IkRyaXZlVGhydVJQRy5jb20iLCJsb2dpbklwIjoiNDcuMTMuODQuMTA1IiwiZG9tYWluIjoiYXBpLmRyaXZldGhydXJwZy5jb20iLCJjdXJyZW50SXAiOiI0Ny4xMy44NC4xMDUiLCJsb2dpbk9yaWdpbiI6MTAsImN1c3RvbWVySWQiOjMxMTM4MzcsImN1c3RvbWVyRmlyc3ROYW1lIjoiVGF5bG9yICIsImN1c3RvbWVyTGFzdE5hbWUiOiJUdXJuZXIiLCJwdWJsaXNoZXJJZCI6bnVsbCwiaW5pdGlhbEFkdWx0Q29udGVudE9wdEluIjpmYWxzZSwiaW5pdGlhbEFpR2VuQ29udGVudEVuYWJsZWQiOnRydWUsImluaXRpYWxEZWZhdWx0Q3VycmVuY3kiOiJVU0QiLCJpbml0aWFsRGVmYXVsdExhbmd1YWdlSWQiOjEsImlzR3Vlc3QiOmZhbHNlLCJiYXNrZXRVVUlEIjoiODYyYmExNzUtM2RiMi00OTg3LTliZTItMTBkZGJhZjllYjY0In0;"
    "phnx_auth_cookie_s=Oed7iCuddhFLtmzksAysrn8SvvGJlGqGFsK635YCDYx3CTGqjMG8us68R4eFl2NoHHk_ao2TTBUF9TY42uA9vT-O-8e7N7wRQ41f-jEvJu_Ovb9Axq_zlxN3Z16spcIHHDylw3nBKIomHM6Y3wDXiEZZxp4qwnDCvSl3et5neLM190TVj4PgpepPYRr6-V5vyjGo-Rj8po1aqCqn0YwEHnQzM9YcwBskSA8kD3AE_ZATONOZ0z0F-PgaFEEpdJG3LyXdZZ9XVLHE-DbOlW2I30HX4y3GQ1BKNCp_BZI1LiTTtBx5lJL8YfTQLKgJEXURZrHN8a4_r8nVEEoz6UxRu28lphQqfPSue8YwIBwgdbj4rrnbhYUuDRWE3eha7NG8JwlKmtJOn9I-JlRopz0k4K-Q2Pb8Pi8COiKwKp-RaCtjs-JaKM1_zC1dbDyZ1ONWY5oa2Jkv44JB-oQ4VfAPJYTm1KepAtx-mijQnlI69SWIaxkWMqLL8km8kpnoxqSIh-Av07KAiShXOT7dEH3BonEY9_wkUUGEQSl-Uaafydjb4Be_pFTy9UYtgrXVyOEg6tyMsl7MTt_yLZApE4urxnsOpvslalJNYcUwP3cHLJaJjXGOgrmS6NXwCDY9KUrTR5mfcoG2qvcNOUe2l15DwjT0HNcQAsDMcH7n3UEwH_k;"
    "osCsid=98f6ufhj16rr9m3ev17o1orpabsvvdr7; autologon=1;"
    "phnx_test_group_12=25206"
)

# Map book slug to product ID
# Derived from buyUrl or from our searches
BOOK_TO_PRODUCT = {
    "champions-of-the-spheres": 227710,
    "spheres-apocrypha-apex-shifter": 276206,
    "diamond-spheres-harmony-and-discord": 492540,
    "diamond-spheres-thaumic-potential": 480696,
    "lost-champions-mountebank": 253379,
    "lost-champions-necros": 253381,
    "spheres-apocrypha-monster-traditions": 342742,
    "spheres-apocrypha-armor-talents-2": 374214,
    "spheres-apocrypha-dipsomania": 299935,
    "spheres-apocrypha-tandem-talents": 282809,
    "spheres-apocrypha-debilitating-talents": 304600,
    "spheres-apocrypha-alchemical-formulae": 285370,
    "spheres-apocrypha-alchemical-poisons": 295353,
    "spheres-apocrypha-alchemy-poisons-2": 320796,
    "expanded-options-2": 287225,
    "highlanders-handbook": 284514,
    "ultimate-engineering": 472038,
}

covers_dir = "src/assets/covers"
os.makedirs(covers_dir, exist_ok=True)

UA = "Mozilla/5.0 (X11; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0"

for book_slug, product_id in BOOK_TO_PRODUCT.items():
    cover_path = os.path.join(covers_dir, f"{book_slug}.webp")
    if os.path.exists(cover_path):
        print(f"✓ {book_slug} - already have cover")
        continue

    url = f"https://legacy.drivethrurpg.com/product/{product_id}"
    print(f"\n→ {book_slug} (product {product_id})")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Cookie": COOKIE})
        with urllib.request.urlopen(req, timeout=30) as resp:
            html = resp.read().decode("utf-8", errors="replace")

        # Find og:image
        match = re.search(r'property="og:image"\s+content="([^"]+)"', html)
        if not match:
            print(f"  ✗ No og:image found")
            continue

        cover_url = match.group(1)
        print(f"  Cover URL: {cover_url}")

        # Download the cover
        img_req = urllib.request.Request(cover_url, headers={"User-Agent": UA})
        with urllib.request.urlopen(img_req, timeout=30) as img_resp:
            img_data = img_resp.read()

        # Save as temporary file
        temp_path = os.path.join(covers_dir, f"_temp_{book_slug}")
        with open(temp_path, "wb") as f:
            f.write(img_data)

        # Check if it's already webp
        content_type = img_resp.headers.get("Content-Type", "")
        if "webp" in content_type or cover_url.lower().endswith(".webp"):
            os.rename(temp_path, cover_path)
            print(f"  ✓ Saved as {book_slug}.webp")
        else:
            # Convert to webp using imagemagick or ffmpeg
            try:
                subprocess.run(
                    ["convert", temp_path, cover_path],
                    check=True,
                    capture_output=True,
                    timeout=30,
                )
                os.remove(temp_path)
                print(f"  ✓ Converted and saved as {book_slug}.webp")
            except (FileNotFoundError, subprocess.CalledProcessError):
                # Try saving as-is with original extension
                ext = os.path.splitext(cover_url.split("?")[0])[1] or ".jpg"
                final = os.path.join(covers_dir, f"{book_slug}{ext}")
                os.rename(temp_path, final)
                print(f"  ⚠ Saved as {book_slug}{ext} (could not convert to webp)")

    except Exception as e:
        print(f"  ✗ Error: {e}")

print("\nDone!")
