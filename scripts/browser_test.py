import sys
import time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3311"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1400, "height": 1000})
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: console_errors.append(f"pageerror: {exc}"))

        page.goto(BASE, wait_until="networkidle")
        page.screenshot(path="/tmp/01_input.png")
        print("Loaded input screen. Title:", page.title())

        page.click("text=Use a sample game")
        page.click("text=Review Game")
        print("Clicked Review Game, waiting for analysis...")

        page.wait_for_selector("text=Key moments", timeout=60000)
        page.screenshot(path="/tmp/02_review.png")
        print("Review screen rendered.")

        # Click a move in the move list
        page.click("text=Nxe5")
        time.sleep(0.5)
        page.screenshot(path="/tmp/03_move_selected.png")

        # Click flip board
        page.click("text=Flip board")
        time.sleep(0.3)
        page.screenshot(path="/tmp/04_flipped.png")

        # Click a key moment chip
        chips = page.locator("button:has-text('Blunder')")
        if chips.count() > 0:
            chips.first.click()
            time.sleep(0.3)
            page.screenshot(path="/tmp/05_key_moment.png")

        print("Console errors:", console_errors)
        browser.close()

if __name__ == "__main__":
    main()
