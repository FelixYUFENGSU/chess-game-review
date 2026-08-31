from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1400, "height": 1000})
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto(BASE, wait_until="networkidle")
        page.click("text=Use a sample game")
        page.click("text=Review Game")
        page.wait_for_selector("text=Key moments", timeout=60000)

        page.screenshot(path="/tmp/30_navbar.png")

        page.click("button[aria-label='Next move']")
        page.click("button[aria-label='Next move']")
        page.click("button[aria-label='Next move']")
        page.wait_for_timeout(200)
        counter = page.locator("text=/\\d+ \\/ \\d+/").inner_text()
        print("after 3x next:", counter)
        page.screenshot(path="/tmp/31_after_next.png")

        page.click("button[aria-label='Last move']")
        page.wait_for_timeout(200)
        counter = page.locator("text=/\\d+ \\/ \\d+/").inner_text()
        print("after last:", counter)

        page.click("button[aria-label='Previous move']")
        page.wait_for_timeout(200)
        counter = page.locator("text=/\\d+ \\/ \\d+/").inner_text()
        print("after prev:", counter)

        page.click("button[aria-label='First move']")
        page.wait_for_timeout(200)
        counter = page.locator("text=/\\d+ \\/ \\d+/").inner_text()
        print("after first:", counter)

        print("console errors:", errors)
        browser.close()

if __name__ == "__main__":
    main()
