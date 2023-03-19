const url = 'https://www.cyclop.in/collections/bike-lights?limit=100&pf_t_brightness_in_lumens=1000&pf_t_brightness_in_lumens=1100&pf_t_brightness_in_lumens=1600&pf_t_brightness_in_lumens=800&pf_t_type_of_product=Front+Lights&sort=price-descending';

const fs = require('fs');
const puppeteer = require('puppeteer');

async function scrapeWebsite(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  // Extract the data you want from the page using selectors
  const productCards = await page.$$('.collection-grid__wrapper .grid-product');
  const data = await Promise.all(productCards.map(async (card) => {
    const link = await card.$eval('a.grid-product__link', (el) => el.href.trim());
    const title = await card.$eval('.grid-product__meta .grid-product__title', (el) => el.innerText.trim());
    const price = await card.$eval('.grid-product__meta .grid-product__price', (el) => el.innerText.trim());

    // Navigate to the product page to extract more details
    const productPage = await browser.newPage();
    await productPage.goto(link);
    const description = await productPage.$eval('.product-block:not(.product-block--price) > .rte', (el) => el.innerText.trim());
    const ratingValue = await productPage.$eval('.jdgm-prev-badge', (el) => el.getAttribute('data-average-rating').trim());
    const ratingCount = await productPage.$eval('.jdgm-prev-badge', (el) => el.getAttribute('data-number-of-reviews').trim());

    // Close the product page and return the data
    await productPage.close();
    return { link, title, price, description, rating: { value: ratingValue, count: ratingCount } };
  }));

  await browser.close();
  return data;
}

scrapeWebsite(url).then((data) => {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `results/out_${timestamp}.json`;
  const json = JSON.stringify(data, null, 2);
  fs.writeFile(filename, json, (err) => {
    if (err) {
      console.error(`Error writing to file: ${err}`);
    } else {
      console.log(`Data written to ${filename}`);
    }
  });
});
