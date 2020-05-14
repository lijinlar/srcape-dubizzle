const puppeteer = require('puppeteer');
const fs = require('fs');
const xlsx = require("xlsx");
const KhaleejScrapper = require("./KhaleejScrapper");
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
    headless: true,
    userDataDir: './maya',
    args: ['--no-sandbox']
};
// For saving file with suffix
var today = new Date();
var dateString = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();

async function scrapeData() {
    var targetUrl = "https://buzzon.khaleejtimes.com/ad-category/jobs-seeker/";
    var classifiedPosts;
    var leadsData;
    try {
        classifiedPosts = require(`./job-seekers/${dateString}/result-${dateString}.json`);
    }
    catch (err) {
        console.log("Error: " + err.message);
        fs.mkdir(`job-seekers/${dateString}`, { recursive: true }, (err) => {
        });
    }
    try {
        leadsData = require(`./job-seekers/${dateString}/leads-${dateString}.json`);
    }
    catch (err) {
        console.log("Error: " + err.message);
    }
    var khaleejScrapper = new KhaleejScrapper(targetUrl, puppeteer, config);
    if (!classifiedPosts) {
        classifiedPosts = await khaleejScrapper.openAllPages();
        fs.writeFileSync(`./job-seekers/${dateString}/result-${dateString}.json`, JSON.stringify(classifiedPosts));
    }
    if (!leadsData) {
        leadsData = await khaleejScrapper.scrapeDetailsFromPages(classifiedPosts);
        console.log("Data:", leadsData.length);
        fs.writeFileSync(`./job-seekers/${dateString}/leads-${dateString}.json`, JSON.stringify(leadsData));
    }
    generateExcel(leadsData);
    insertToTable(leadsData, dateString);

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

    xlsx.utils.book_append_sheet(newWB, newWS, `${dateString}`);//workbook name as param

    xlsx.writeFile(newWB, `./job-seekers/${dateString}/leads-${dateString}.xlsx`);//file name as param
}

async function insertToTable(leadsData, dateString) {
    await client.connect();
    leadsData.forEach(async (data) => {
        try {
            var insertQuery = `insert into job_seekers(title,salary,experience,job_type,job_category,contact_no,email,street,city,description,scraped_on,webiste)
            values (
            '${data["title"] || "N/A"}','${data["salary:"] || "N/A"}','${data["experience:"] || "N/A"}','${data["job_type:"] || "N/A"}','${data["job_category:"] || "N/A"}','${data["contact_no.:"] || "N/A"}','${data["email:"] || "N/A"}','${data["street:"] || "N/A"}','${data["city:"] || "N/A"}',$$'${data["description"] || "N/A"}'$$,'${dateString}','${"Khaleej"}'
            )`;
            client.query(insertQuery, (er, res) => {
                // console.log(er.message);
                if (er)
                    console.log("Error: " + er.message, data);
            });
        } catch (err) {
            console.log("Error: " + err.message);
        }
        // create table job_seekers(
        //     id SERIAL PRIMARY KEY,
        //     title text,
        //     salary text,
        //     experience text,
        //     job_type text,
        //     job_category text,
        //     contact_no text,
        //     email text,
        //     street text,
        //     city text,
        //     description text,
        //     scraped_on text,
        //     webiste text
        //     );
        // grant all privileges on table job_seekers to scrapper;
        // grant all privileges on sequence job_seekers_id_seq to scrapper;
    });
}

(async () => {
    await scrapeData();
})();