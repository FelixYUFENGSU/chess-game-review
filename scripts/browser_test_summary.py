from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto(BASE, wait_until="networkidle")
        page.click("text=Chess.com")
        page.fill("input[placeholder='username']", "hikaru")
        page.click("text=Find games")
        page.wait_for_timeout(3000)
        page.locator("button:has-text('vs')").first.click()
        page.wait_for_selector("text=Key moments", timeout=90000)

        page.click("button[aria-label='Last move']")
        page.wait_for_timeout(300)
        page.screenshot(path="/tmp/80_game_summary.png")

        text = page.locator("text=Game Summary").locator("..").inner_text()
        print("=== Game Summary card ===")
        print(text)

        # Navigating away should go back to a normal move explanation.
        page.click("button[aria-label='Previous move']")
        page.wait_for_timeout(200)
        still_summary = page.locator("text=Game Summary").count()
        print("Game Summary visible after stepping back:", still_summary > 0)

        print("errors:", errors)
        browser.close()

if __name__ == "__main__":
    main()
