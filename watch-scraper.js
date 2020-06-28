const puppeteer = require('puppeteer');
const fs = require('fs');
const xlsx = require("xlsx");
const DubizzleDataScrapper = require('./DubizzleDataScrapper');
const { Client } = require('pg')
const client = new Client({
  user: 'scrapper',
  host: 'localhost',
  database: 'watch_leads',
  password: 'scrapper123!',
  // port: 3211,
});

// Configuration for browser
var config = {
  headless: false,
  userDataDir: './users/yopa',
  args: ['--no-sandbox']
};
// For saving file with suffix
var today = new Date();
var dateString = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
var category = "watches";
// ========================= watch data scrapping ==========================================
async function scrapeData() {
  var targetUrl = "https://uae.dubizzle.com/classified/jewelry-watches/watches/?site=--&s=CL&rc=804&c1=805&c2=--&price__gte=5000&price__lte=&keywords=&is_basic_search_widget=0&is_search=1&added__gte=&age__lte=&condition__gte=&usage__lte=";
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
  var dubizzleScrapper = new DubizzleDataScrapper(targetUrl, puppeteer, config);
  if (!scrappedData) {
    // var links = await dubizzleScrapper.getPageLinks();
    // console.log(links);
    // var listOfPosts = await dubizzleScrapper.getListOfPosts(links);
    var listOfPosts = await dubizzleScrapper.openAllPages();
    console.log(listOfPosts.length);
    fs.writeFileSync(`./${category}/${dateString}/result-${dateString}.json`, JSON.stringify(listOfPosts));
    var detailsOfClassifieds = await dubizzleScrapper.getFullDetails(listOfPosts);
    fs.writeFileSync(`./${category}/${dateString}/leads-${dateString}.json`, JSON.stringify(detailsOfClassifieds));
    generateExcel(leadsData);
  } else if (!leadsData) {
    console.log(`Already scrapped list (${scrappedData.length})`);
    var detailsOfClassifieds = await dubizzleScrapper.getFullDetails(scrappedData);
    fs.writeFileSync(`./${category}/${dateString}/leads-${dateString}.json`, JSON.stringify(detailsOfClassifieds));
    generateExcel(leadsData);
  } else if (leadsData) {
    generateExcel(leadsData);
    // await insertToDb(dateString);
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

async function insertToDb(dateString) {
  try {
    var allData = require(`./watch/${dateString}/leads-${dateString}.json`);
    await client.connect()
    allData.forEach((data) => {
      try {
        var insertQuery = `INSERT INTO 
      leads(title, link, price, posted_on, age, usage, condition, materials, neighbourhood, description, seller, phone, scraped_on) 
      VALUES('${(data["title"] || "N/A")}', '${(data["link"] || "N/A")}', '${(data["price"] || "N/A")}', '${(data["Posted on"] || "N/A")}', '${(data["Age"] || "N/A")}', '${(data["Usage"] || "N/A")}', '${(data["Condition"] || "N/A")}', '${(data["Materials"] || "N/A")}', '${(data["Neighbourhood"] || "N/A")}', $$'${(data["Description"] || "N/A")}'$$, '${(data["seller"] || "N/A")}', '${(data["phone"] || "N/A")}', '${dateString}')`;
        client.query(insertQuery, (er, res) => {
          // console.log(er.message);
          if (er)
            console.log("Error: " + er.message, data);
        });
      } catch (err) {
        console.log("Error: " + err.message);
      }

    });

  } catch (error) {
    console.log("Error: " + error.message);
  }

  // (id SERIAL PRIMARY KEY,title TEXT,link text, price text, posted_on text, age text, usage text, condition text, description text, seller text, phone text, materials text, neighbourhood text, scraped_on text)
  // (title, price, posted_on, phone) 
  // grant all privileges on table leads to scrapper;
  // grant all privileges on sequence leads_id_seq to scrapper;
}
// ========================= end of watch data scrapping ===================================
(async () => {
  scrapeData();
//   const browser = await puppeteer.launch({
//     ...config
// });
// const page = await browser.newPage();
})();