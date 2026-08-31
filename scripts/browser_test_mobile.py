from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 390, "height": 844})
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto(BASE, wait_until="networkidle")
        page.click("text=Use a sample game")
        page.click("text=Review Game")
        page.wait_for_selector("text=Key moments", timeout=60000)
        page.screenshot(path="/tmp/50_mobile.png", full_page=True)
        page.click("button[aria-label='Next move']")
        page.wait_for_timeout(200)
        page.screenshot(path="/tmp/51_mobile_next.png")
        print("errors:", errors)
        browser.close()

if __name__ == "__main__":
    main()
