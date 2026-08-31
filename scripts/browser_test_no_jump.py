from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        page.goto(BASE, wait_until="networkidle")
        page.click("text=Chess.com")
        page.fill("input[placeholder='username']", "hikaru")
        page.click("text=Find games")
        page.wait_for_timeout(3000)
        page.locator("button:has-text('vs')").first.click()
        page.wait_for_selector("text=Key moments", timeout=90000)

        board = page.locator("text=Flip board")
        box0 = board.bounding_box()
        scroll0 = page.evaluate("window.scrollY")
        print("initial board box:", box0, "window.scrollY:", scroll0)

        max_shift = 0.0
        for i in range(45):
            page.click("button[aria-label='Next move']")
            page.wait_for_timeout(60)
            box = board.bounding_box()
            scroll_y = page.evaluate("window.scrollY")
            if box and box0:
                shift = abs(box["x"] - box0["x"]) + abs(box["y"] - box0["y"])
                max_shift = max(max_shift, shift)
                if shift > 1:
                    print(f"click {i}: board moved by {shift:.1f}px, window.scrollY={scroll_y}")

        print("max board position shift across all clicks:", max_shift)
        page.screenshot(path="/tmp/40_no_jump_final.png")
        browser.close()

if __name__ == "__main__":
    main()
