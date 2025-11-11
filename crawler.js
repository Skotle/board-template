
const puppeteer = require('puppeteer');
const urls = [
  'http://localhost:3000/',
  'http://localhost:3000/board.html?board=openeye',
  'http://localhost:3000/post.html?board=openeye&id=69162922'
];

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (const url of urls) {
    await page.goto(url, { waitUntil: 'networkidle0' });
    const html = await page.content();
    console.log(html); // 완전히 렌더된 HTML
  }

  await browser.close();
})();
