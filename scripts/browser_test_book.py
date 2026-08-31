import time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto(BASE, wait_until="networkidle")
        page.click("text=Use a sample game")
        start = time.time()
        page.click("text=Review Game")
        page.wait_for_selector("text=Key moments", timeout=60000)
        elapsed = time.time() - start
        print(f"analysis completed in {elapsed:.2f}s")

        page.click("text=e4")
        page.wait_for_timeout(200)
        page.screenshot(path="/tmp/60_book_move.png")

        print("errors:", errors)
        browser.close()

if __name__ == "__main__":
    main()
