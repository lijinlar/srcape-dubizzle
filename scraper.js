const puppeteer = require('puppeteer');
const fs = require('fs');
const xlsx = require("xlsx");
const DubizzleDataScrapper = require('./DubizzleDataScrapper');
// var targetUrl = "https://dubai.dubizzle.com/classified/jewelry-watches/watches/mens-watches/?price__gte=5000&price__lte=&keywords=&is_basic_search_widget=1&is_search=1";
var targetUrl = "https://dubai.dubizzle.com/classified/mobile-phones-pdas/?site=2&s=CL&rc=852&c1=--&price__gte=&price__lte=&keywords=iphone+11&is_basic_search_widget=0&is_search=1&places__id__in=--&added__gte=3&age__lte=&condition__gte=4&usage__lte=&has_photos=1";
var scrappedData;
var leadsData;
// Configuration for browser
var config = {
  headless: true,
  userDataDir: './cache',
  args: ['--no-sandbox']
};
// For saving file with suffix
var today = new Date();
var dateString = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
try {
  scrappedData = require(`./${dateString}/result-${dateString}.json`);
}
catch (err) {
  console.log("Error: " + err.message);
}
try {
  leadsData = require(`./${dateString}/leads-${dateString}.json`);
}
catch (err) {
  console.log("Error: " + err.message);
}
(async () => {

  var dubizzleScrapper = new DubizzleDataScrapper(targetUrl, puppeteer, config);
  if (!scrappedData) {
    var links = await dubizzleScrapper.getPageLinks();
    // console.log(links);
    var listOfPosts = await dubizzleScrapper.getListOfPosts(links);
    console.log(listOfPosts.length);
    fs.writeFileSync(`./${dateString}/result-${dateString}.json`, JSON.stringify(listOfPosts));
    var detailsOfClassifieds = await dubizzleScrapper.getFullDetails(listOfPosts);
    fs.writeFileSync(`./${dateString}/leads-${dateString}.json`, JSON.stringify(detailsOfClassifieds));
    generateExcel(leadsData);
  } else if (!leadsData) {
    console.log(`Already scrapped list (${scrappedData.length})`);
    var detailsOfClassifieds = await dubizzleScrapper.getFullDetails(scrappedData);
    fs.writeFileSync(`./${dateString}/leads-${dateString}.json`, JSON.stringify(detailsOfClassifieds));
    generateExcel(leadsData);
  } else if (leadsData) {
    generateExcel(leadsData);
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

    xlsx.writeFile(newWB, `./${dateString}/leads-${dateString}.xlsx`);//file name as param
  }
})();