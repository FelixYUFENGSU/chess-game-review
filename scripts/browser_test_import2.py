from playwright.sync_api import sync_playwright

BASE = "http://localhost:3311"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1400, "height": 1000})
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))

        page.goto(BASE, wait_until="networkidle")
        page.click("text=Chess.com")
        page.fill("input[placeholder='username']", "hikaru")
        page.click("text=Find games")
        page.wait_for_timeout(3000)
        # click the first game result
        page.locator("button:has-text('vs')").first.click()
        page.wait_for_selector("text=Key moments", timeout=90000)
        page.screenshot(path="/tmp/12_chesscom_imported_review.png")
        print("Chess.com imported game reviewed successfully.")
        print("errors:", errors)
        browser.close()

if __name__ == "__main__":
    main()
