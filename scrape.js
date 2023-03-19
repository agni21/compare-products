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
    const description = await productPage.$eval('.product-block:not(.product-block--price) > .rte', (el) => el.innerText.trim());const ratingEl = await productPage.$('.jdgm-prev-badge');
    const rating = ratingEl ? await ratingEl.evaluate((el) => ({
      average: el.getAttribute('data-average-rating').trim(),
      count: el.getAttribute('data-number-of-reviews').trim(),
    })) : null;

    // Extract specifications from the product description
    const lumensMatch = description.match(/(\d+)\s*lumens?/i);
    const batteryMatch = description.match(/(\d+)\s*mah/i);
    const weightMatch = description.match(/(\d+)\s*(g|grams)/i);
    const specifications = {
      output: lumensMatch ? lumensMatch[1] : null,
      batteryCapacity: batteryMatch ? batteryMatch[1] : null,
      weight: weightMatch ? weightMatch[1] : null,
    };
    console.log(specifications);
    // Close the product page and return the data
    await productPage.close();
    return { link, title, price, description, specifications, rating };
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
