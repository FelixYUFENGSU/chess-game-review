from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto(BASE, wait_until="networkidle")

        # Analyze a game first (this is what triggers Stockfish init / the fetch-null bug).
        page.click("text=Use a sample game")
        page.click("text=Review Game")
        page.wait_for_selector("text=Key moments", timeout=60000)
        page.click("text=Review another game")

        # Now try importing by username, exactly what the user reported failing.
        page.click("text=Chess.com")
        page.fill("input[placeholder='username']", "hikaru")
        page.click("text=Find games")
        page.wait_for_timeout(4000)
        page.screenshot(path="/tmp/70_import_after_analyze.png")

        error_text = page.locator("text=/error|not a function/i")
        print("visible error count:", error_text.count())
        if error_text.count() > 0:
            print("error text:", error_text.first.inner_text())

        print("console errors:", errors)
        browser.close()

if __name__ == "__main__":
    main()
