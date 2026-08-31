import time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3311"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1400, "height": 1000})
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto(BASE, wait_until="networkidle")
        page.click("text=Use a sample game")
        page.click("text=Deep")
        start = time.time()
        page.click("text=Review Game")
        page.wait_for_selector("text=Key moments", timeout=120000)
        elapsed = time.time() - start
        print(f"Deep analysis completed in {elapsed:.1f}s")
        page.screenshot(path="/tmp/20_deep_mode.png")
        print("errors:", errors)
        browser.close()

if __name__ == "__main__":
    main()
