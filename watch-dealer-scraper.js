const puppeteer = require('puppeteer');
const fs = require('fs');
const xlsx = require("xlsx");
const Chrono24DataScrapper = require('./Chrono24DataScrapper');
const { Client } = require('pg')
// const client = new Client({
//   user: 'scrapper',
//   host: 'localhost',
//   database: 'watch_leads',
//   password: 'scrapper123!',
//   // port: 3211,
// });

// Configuration for browser
var config = {
  headless: true,
  userDataDir: './users/yopa',
  args: ['--no-sandbox']
};
// For saving file with suffix
var today = new Date();
var dateString = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
var category = "dealers/Tag-New";
// ========================= watch data scrapping ==========================================
async function scrapeData() {
  var targetUrl = "https://www.chrono24.ae/search/index.htm?countryIds=AE&dosearch=true&manufacturerIds=236&maxAgeInDays=0&onlyDealerAds=false&pageSize=60&priceFrom=0&priceTo=-1&redirectToSearchIndex=true&sortorder=0";
  var scrappedData;
  var leadsData;
  try {
    scrappedData = require(`./${category}/${dateString}/result-${dateString}.json`);
  }
  catch (err) {
    console.log("Error: " + err.message);
    fs.mkdir(`${category}/${dateString}`, { recursive: true }, (err) => {
    });
  }
  try {
    leadsData = require(`./${category}/${dateString}/leads-${dateString}.json`);
  }
  catch (err) {
    console.log("Error: " + err.message);
  }
  var chrono24Scrapper = new Chrono24DataScrapper(targetUrl, puppeteer, config);
  if (!scrappedData) {
    scrappedData = await chrono24Scrapper.openAllPages();
    console.log(scrappedData.length);
    fs.writeFileSync(`./${category}/${dateString}/result-${dateString}.json`, JSON.stringify(scrappedData));
    var detailsOfClassifieds = await chrono24Scrapper.getFullDetails(scrappedData);
    fs.writeFileSync(`./${category}/${dateString}/leads-${dateString}.json`, JSON.stringify(detailsOfClassifieds));
    generateExcel(leadsData);
  } else if (!leadsData) {
    console.log(`Already scrapped list (${scrappedData.length})`);
    var detailsOfClassifieds = await chrono24Scrapper.getFullDetails(scrappedData);
    fs.writeFileSync(`./${category}/${dateString}/leads-${dateString}.json`, JSON.stringify(detailsOfClassifieds));
    generateExcel(leadsData);
  } else if (leadsData) {
    generateExcel(leadsData);
  }
}

function generateExcel(leadsData) {
  var files = [];
  for (var each in leadsData) {
    files.push(leadsData[each]);
  }
  var obj = files.map((e) => {
    return e;
  });

  var newWB = xlsx.utils.book_new();

  var newWS = xlsx.utils.json_to_sheet(obj);

  xlsx.utils.book_append_sheet(newWB, newWS, `leads-${dateString}`);//workbook name as param

  xlsx.writeFile(newWB, `./${category}/${dateString}/leads-${dateString}.xlsx`);//file name as param
}

// ========================= end of watch data scrapping ===================================
(async () => {
  scrapeData();
//   const browser = await puppeteer.launch({
//     ...config
// });
// const page = await browser.newPage();
})();