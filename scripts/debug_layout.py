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

        for _ in range(30):
            page.click("button[aria-label='Next move']")
            page.wait_for_timeout(30)

        info = page.evaluate("""
        () => {
          const h1 = document.querySelector('h1');
          const outer = h1.closest('div').parentElement;
          const cs = getComputedStyle(outer);
          return {
            outerTag: outer.tagName,
            outerClass: outer.className,
            outerHeight: cs.height,
            outerOverflow: cs.overflowY,
            bodyScrollHeight: document.body.scrollHeight,
            htmlScrollHeight: document.documentElement.scrollHeight,
            innerHeight: window.innerHeight,
          };
        }
        """)
        print(info)
        browser.close()

if __name__ == "__main__":
    main()
