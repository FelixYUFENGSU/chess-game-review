from playwright.sync_api import sync_playwright

BASE = "http://localhost:3311"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1400, "height": 1000})
        page.goto(BASE, wait_until="networkidle")
        page.click("text=Chess.com")
        page.fill("input[placeholder='username']", "hikaru")
        page.click("text=Find games")
        page.wait_for_timeout(3000)
        page.locator("button:has-text('vs')").first.click()
        page.wait_for_selector("text=Key moments", timeout=90000)

        for label in ["24. Nxb7", "31. Qxa8", "36. Rxh7+", "38. Rf7+"]:
            page.click(f"button:has-text('{label}')")
            page.wait_for_timeout(300)
            text = page.locator("text=Eval:").locator("..").inner_text()
            print("====", label, "====")
            print(text)
        browser.close()

if __name__ == "__main__":
    main()
