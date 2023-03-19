// const url = 'https://www.cyclop.in/collections/bike-lights?limit=100&pf_t_brightness_in_lumens=1000&pf_t_brightness_in_lumens=1100&pf_t_brightness_in_lumens=1600&pf_t_brightness_in_lumens=800&pf_t_type_of_product=Front+Lights&sort=price-descending';

const puppeteer = require('puppeteer');
const fs = require('fs');

const url = process.argv[2];
console.log(url);
if (!url) {
  console.error('Please provide a URL');
  process.exit(1);
}

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

    // Extract the specifications from the product description
    const lumensMatch = description.match(/([\d,]+)\s*(lumens|lm)/i);
    const batteryMatch = description.match(/([\d,]+)\s*(mah)/i);
    const weightMatch = description.match(/([\d,]+)\s*(grams|g)/i);
    const chargingMatch = /type-c/i.test(description);

    const specifications = {};
    if (lumensMatch) {
      specifications.lumens = lumensMatch[1].replace(/,/g, '');
    }
    if (batteryMatch) {
      specifications.batteryCapacity = batteryMatch[1].replace(/,/g, '');
      const sr1 = batteryMatch.input.substring(batteryMatch.index - 100, batteryMatch.index).trim().replace(/\n/g, '.').split('.').slice(-1)[0]
      const sr2 = batteryMatch.input.substring(batteryMatch.index, batteryMatch.index + 100).trim().replace(/\n/g, '.').split('.')[0]
      specifications.batteryRef = sr1 + ' ' + sr2
      console.log(specifications.batteryRef);
    }
    if (weightMatch) {
      specifications.weight = weightMatch[1].replace(/,/g, '');
    }
    if (chargingMatch) {
      specifications.charging = 'Type-C';
    }

    const ratingEl = await productPage.$('.jdgm-prev-badge');
    const rating = ratingEl ? await ratingEl.evaluate((el) => ({
      average: el.getAttribute('data-average-rating').trim(),
      count: el.getAttribute('data-number-of-reviews').trim(),
    })) : null;

    // Close the product page and return the data
    await productPage.close();
    return { link, title, price, description, specifications, rating };
  }));

  await browser.close();
  return data;
}

scrapeWebsite(url).then((data) => {
  const timestamp = Date.now();
  const fileName = `out_${timestamp}.json`;
  const filePath = `./results/${fileName}`;
  fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`Data saved to ${filePath}`);
  });
});
