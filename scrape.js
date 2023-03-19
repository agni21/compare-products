const puppeteer = require('puppeteer');

async function scrapeWebsite(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  // Extract the data you want from the page using selectors
  const productCards = await page.$$('.collection-grid__wrapper .grid-product');
  const data = await Promise.all(productCards.map(async (card) => {
    const link = await card.$eval('a.grid-product__link', (el) => el.href);
    const title = await card.$eval('.grid-product__meta .grid-product__title', (el) => el.innerText.trim());
    const price = await card.$eval('.grid-product__meta .grid-product__price', (el) => el.innerText.trim());
    return { link, title, price };
  }));

  await browser.close();
  return data;
}

const url = 'https://www.cyclop.in/collections/bike-lights?limit=100&pf_t_brightness_in_lumens=1000&pf_t_brightness_in_lumens=1100&pf_t_brightness_in_lumens=1600&pf_t_brightness_in_lumens=800&pf_t_type_of_product=Front+Lights&sort=price-descending';
scrapeWebsite(url).then((data) => console.log(data));