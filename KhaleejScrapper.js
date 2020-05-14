class KhaleejScrapper {
    constructor(url, puppeteer, config) {
        this.url = url;
        this.puppeteer = puppeteer;
        this.browserConfig = config;
        this.users = [
            "./users/lijin",
            "./users/maya",
            "./users/rolbin"
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
        await this.initPageInterceptor(page);
        await page.goto(this.url);
        var currentPage = 1;
        var previousPage = 0;
        var classifiedPosts = [];
        while (currentPage > previousPage) {
            try {
                previousPage = currentPage;
                var elements = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll(".post-block-out")).map((elem) => {
                        return {
                            // title: elem.querySelector("").innerText,
                            link: elem.querySelector(".post-left a").href
                        };
                    });
                });
                classifiedPosts = [...classifiedPosts, ...elements];
                await page.evaluate(() => {
                    document.querySelector(".next.page-numbers").click();
                });
                await page.waitForSelector(".page-numbers.current");
                var currentPage = await page.evaluate(() => {
                    return document.querySelector(".page-numbers.current").innerText;
                });
                currentPage = Number(currentPage);
                console.log(previousPage, currentPage);
            } catch (error) {
                console.log("Error: " + error.message);
            }
        }
        await browser.close();
        console.log("Scraped All page lists", previousPage, currentPage);
        return classifiedPosts;
    }

    async scrapeDetailsFromPages(pageLinks) {
        var leadDetailsList = [];
        // await pageLinks.map(async pageData => {
        for (var index in pageLinks) {
            var pageData = pageLinks[index];
            try {

                const browser = await this.puppeteer.launch({
                    ...this.browserConfig,
                    ...{ userDataDir: this.users[this.getRandomInt(this.users.length)] }
                });
                const page = await browser.newPage();
                await this.initPageInterceptor(page);
                await page.goto(pageData.link);
                await page.waitForSelector(".bigright table");
                var leadDetails = await page.evaluate(() => {
                    var leadDetails = {};
                    leadDetails.title = document.querySelector("h1.single-listing").innerText;
                    Array.from(document.querySelectorAll(".bigright table")).map((elem) => {
                        leadDetails[elem.querySelector("td").innerText.trim().toLowerCase().replace(" ", "_")] = elem.querySelector("td:nth-child(2)").innerText.trim();
                    });
                    var descriptionElement = document.querySelector(".single-main");
                    descriptionElement.querySelector("h3.description-area").remove();
                    leadDetails.description = descriptionElement.innerText;
                    return leadDetails;
                });
                leadDetailsList = [...leadDetailsList, leadDetails];
                page.close();
                browser.close();
            } catch (error) {
                console.log("Error: " + error.message);
            }
            // });
        }
        return leadDetailsList;
    }

    async initPageInterceptor(page) {
        await page.setRequestInterception(true);
        page.on('request', request => {
            if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) != -1) {
                request.abort();
            }
            else if (this.domainsToExlcude.includes(new URL(request.url()).host)) {
                console.log("Blocked: " + request.url())
                request.abort()
            }
            else {
                request.continue();
            }

        });
    }
    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }
}
module.exports = KhaleejScrapper;