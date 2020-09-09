const fs = require('fs');
const rimraf = require("rimraf");
class DubizzleDataScrapper {
    constructor(url, puppeteer, config) {
        this.url = url;
        this.puppeteer = puppeteer;
        this.browserConfig = config;
        this.users = [
            "./users/hayik",
            // "./users/yopa"
            // "./users/rolbin"
        ];
        this.domainsToExlcude = [
            "www.google.ae",
            "www.google.com",
            "sslwidget.criteo.com"
        ];
        try {
            this.statusData = require(`./tmp/status.json`);
        }
        catch (err) {
            this.statusData = { failedAfter: -1 };
            fs.mkdir(`./tmp`, { recursive: true }, (err) => {
            });
        }
    }

    async openAllPages() {
        const browser = await this.puppeteer.launch({
            ...this.browserConfig,
            ...{ userDataDir: this.users[this.getRandomInt(this.users.length)] }
        });
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', request => {
            if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) != -1) {
                request.abort();
            }
            else if (this.domainsToExlcude.includes(new URL(request.url()).host)) {
                console.log("Blocked: " + request.url());
                request.abort();
            }
            else {
                request.continue();
            }

        });
        await page.goto(this.url);
        var currentPage = 1;
        var previousPage = 0;
        var classifiedPosts = [];
        while (currentPage > previousPage) {
            try {
                previousPage = currentPage;
                var elements = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll(".cf.item")).map((elem) => {
                        return {
                            title: elem.querySelector(".listing-item .item-title .results-listing-title span a").innerHTML.trim(),
                            link: elem.querySelector(".listing-item .item-title .results-listing-title span a").href,
                            price: elem.querySelector(".listing-item .item-title .price").innerText.trim(),
                        };
                    });
                });
                classifiedPosts = [...classifiedPosts, ...elements];
                await page.waitForSelector("#next_page");
                await page.evaluate(() => {
                    document.querySelector("#next_page").click();
                });
                await page.waitForSelector("span.page-links");
                var currentPage = await page.evaluate(() => {
                    return document.querySelector("span.page-links").innerText;
                });
                currentPage = Number(currentPage);
            } catch (error) {
                console.log("Error: " + error.message);
            }

        }
        await browser.close();
        console.log("Scraped All page lists");
        return classifiedPosts;
    }

    // Not using now as I implemented openAllPages() for scraping all pages data
    async getPageLinks() {
        const browser = await this.puppeteer.launch({
            ...this.browserConfig,
            ...{ userDataDir: this.users[this.getRandomInt(this.users.length)] }
        });
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', request => {
            // console.log(new URL(request.url()).host);
            if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) != -1) {
                request.abort();
            }
            else if (this.domainsToExlcude.includes(new URL(request.url()).host)) {
                console.log("Blocked: " + request.url());
                request.abort();
            }
            else {
                request.continue();
            }

        });
        await page.goto(this.url);
        var pages = [
            {
                page: "1",
                url: this.url
            }
        ];
        var allPages = await page.evaluate(() => {
            return Array.from(document.querySelectorAll("a.page-links")).map((pageLink) => {
                return {
                    page: pageLink.innerText.trim(),
                    url: pageLink.href
                };
            });
        });
        await browser.close();
        return [...pages, ...allPages];
    }

    // Not using now as I implemented openAllPages() for scraping all pages data
    async getListOfPosts(pages) {
        var classifiedPosts = [];
        for (var index in pages) {
            const browser = await this.puppeteer.launch({
                ...this.browserConfig,
                ...{ userDataDir: this.users[this.getRandomInt(this.users.length)] }
            });
            const page = await browser.newPage();
            await page.setRequestInterception(true);
            page.on('request', request => {
                if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) != -1) {
                    request.abort();
                }
                else if (this.domainsToExlcude.includes(new URL(request.url()).host)) {
                    console.log("Blocked: " + request.url());
                    request.abort();
                }
                else {
                    request.continue();
                }

            });
            await page.goto(pages[index].url);
            var elements = await page.evaluate(() => {
                return Array.from(document.querySelectorAll(".cf.item")).map((elem) => {
                    return {
                        title: elem.querySelector(".listing-item .item-title .results-listing-title span a").innerHTML.trim(),
                        link: elem.querySelector(".listing-item .item-title .results-listing-title span a").href,
                        price: elem.querySelector(".listing-item .item-title .price").innerText.trim(),
                    };
                });
            });
            await page.close();
            await browser.close();
            classifiedPosts = [...classifiedPosts, ...elements];
        }
        return classifiedPosts;
    }
    async getFullDetails(links) {
        var userDataDir = this.users[this.getRandomInt(this.users.length)];
        var newLinkArray;
        try {
            var tmpLinks = require('./tmp/leads.json');
            newLinkArray = tmpLinks;
        } catch{
            newLinkArray = [];
        }
        const browser = await this.puppeteer.launch({
            ...this.browserConfig,
            ...{ userDataDir }
        });
        const page = await browser.newPage();
        for (var index = this.statusData.failedAfter + 1; index <= links.length; index++)
        // var index = this.statusData.failedAt;
        {
            var link = links[index];
            try {
                // await page.setRequestInterception(true);
                // page.on('request', request => {
                //     if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) != -1) {
                //         request.abort();
                //     }
                //     else if (this.domainsToExlcude.includes(new URL(request.url()).host)) {
                //         console.log("Blocked: " + request.url())
                //         request.abort()
                //     }
                //     else {
                //         request.continue();
                //     }

                // });
                await page.goto(link.link);
                link = await page.evaluate((link) => {
                    // Something makes us think you’re a bot.
                    if (document.querySelector(".captcha-form")) {
                        alert("sorry..!");
                        link.detailsOpened = false;
                        link.blocked = false;
                        return link;
                    } else if (document.body.innerHTML.indexOf("Unable To Identify Your Browser" != -1)) {
                        alert("sorry..!");
                        link.detailsOpened = false;
                        link.blocked = true;
                        return link;
                    } else {
                        link["Posted on"] = document.querySelector(".details-date__posted").innerText.trim().replace("Posted on: ", "");
                        Array.from(document.querySelectorAll("#listing-details-list ul li")).map((elem) => {
                            link[elem.querySelector("li span").innerHTML.trim()] = elem.querySelector("li strong").innerText.trim();
                        });
                        // document.querySelector("a.phone-number.awesome.medium.lite-blue.logged-out-call-btn").click();phone-lead
                        document.querySelector("#phone-lead").click();
                        link.detailsOpened = true;
                        return link;
                    }
                }, link);
                if (link.detailsOpened) {
                    await page.waitForSelector("a.phone-number-btn:not(:empty)");
                    link = await page.evaluate(async (link) => {
                        link["seller"] = document.querySelector(".seller-name").innerHTML.trim();
                        link["phone"] = document.querySelector(".phone-number-btn").innerHTML.trim();
                        return link;
                    }, link);
                    newLinkArray.push(link);
                    fs.writeFileSync(`./tmp/leads.json`, JSON.stringify(newLinkArray));
                    // await page.close();
                    console.log("Success:" + index);
                    this.statusData.failedAfter = index;
                    fs.writeFileSync(`./tmp/status.json`, JSON.stringify(this.statusData));
                } else {
                    if (link.blocked) {
                        var newPage = await browser.newPage();
                        await newPage.goto("chrome://settings/");
                    }
                    break;
                }
            } catch (error) {
                console.log("Loop Error:" + index + error.message);
                // this.statusData.failedAt = index;
                // fs.writeFileSync(`./tmp/status.json`, JSON.stringify(this.statusData));
            }
            // await browser.close();
        }

        return newLinkArray;
    }
    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }
}
module.exports = DubizzleDataScrapper;