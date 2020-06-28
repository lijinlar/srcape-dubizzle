class Chrono24DataScrapper {
    constructor(url, puppeteer, config) {
        this.url = url;
        this.puppeteer = puppeteer;
        this.browserConfig = config;
        this.users = [
            "./users/hayik",
            "./users/yopa"
            // "./users/rolbin"
        ];
        this.domainsToExlcude = [
            "www.google.ae",
            "www.google.com",
            "sslwidget.criteo.com"
        ];
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
                    return Array.from(document.querySelectorAll(".article-item-container")).map((elem) => {
                        return {
                            title: elem.querySelector(".article-title").innerHTML.trim(),
                            link: (elem.querySelector("a") || {}).href,
                            price: elem.querySelector(".article-price div strong").innerText.trim(),
                            sellerType: elem.querySelector(".article-seller-name").innerText.trim()
                        };
                    });
                });
                classifiedPosts = [...classifiedPosts, ...elements];
                await page.waitForSelector(".paging-next");
                await page.evaluate(() => {
                    document.querySelector(".paging-next").click();
                });
                await page.waitForSelector("ul.pagination");
                var currentPage = await page.evaluate(() => {
                    return document.querySelector("ul.pagination li span.active").innerText;
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
        // var links = [linksO[13]];
        var newLinkArray = [];
        for (var index in links) {
            const browser = await this.puppeteer.launch({
                ...this.browserConfig,
                ...{ userDataDir: this.users[this.getRandomInt(this.users.length)] }
            });
            var link = links[index];
            if (link.sellerType != "Verified Dealer") {
                continue;
            }
            try {
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
                await page.goto(link.link);
                link = await page.evaluate((link) => {
                    link["sellerName"] = document.querySelector(".merchant-logo+div strong").innerText.trim();
                    link["sellerAddress"] = document.querySelector(".merchant-logo+div").innerText.trim();
                    var contactCount = 1;
                    link["rating"] = Array.from(document.querySelectorAll('.wt-rating-stats .rating [style="width: auto;"]')).length;
                    link["ratingCount"] = document.querySelector(".wt-rating-stats a").innerText.trim();
                    Array.from(document.querySelectorAll(".jq-contact-numbers span")).map((contact) => {
                        link["contact_" + contactCount] = contact.innerText.trim();
                        contactCount++;
                    });
                    return link;
                }, link);
                newLinkArray.push(link);
                await page.close();
                console.log("Success:" + index);
            } catch (error) {
                console.log("Loop Error:" + index + error.message);
            }
            await browser.close();
        }

        return newLinkArray;
    }
    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }
}
module.exports = Chrono24DataScrapper;