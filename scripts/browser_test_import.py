from playwright.sync_api import sync_playwright

BASE = "http://localhost:3311"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1400, "height": 1000})
        page.on("console", lambda msg: print("CONSOLE:", msg.type, msg.text) if msg.type == "error" else None)

        page.goto(BASE, wait_until="networkidle")
        page.click("text=Chess.com")
        page.fill("input[placeholder='username']", "hikaru")
        page.click("text=Find games")
        page.wait_for_timeout(4000)
        page.screenshot(path="/tmp/10_chesscom_list.png")

        page.click("text=Lichess")
        page.fill("input[placeholder='username']", "DrNykterstein")
        page.click("text=Find games")
        page.wait_for_timeout(6000)
        page.screenshot(path="/tmp/11_lichess_list.png")

        browser.close()

if __name__ == "__main__":
    main()
