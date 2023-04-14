const express = require('express');
const axios = require('axios');
const { URL } = require('url');

const app = express();

app.get('/numbers', async(req, res) => {
    const urls = req.query.url;

    const urlArray = Array.isArray(urls) ? urls : [urls];

    let mergedIntegers = [];

    const promises = urlArray.map((url) => {
        try {
            const parsedUrl = new URL(url);

            return axios.get(parsedUrl.toString(), { timeout: 500 })
                .then((response) => {
                    const integers = response.data.numbers.filter((number) => Number.isInteger(number));
                    mergedIntegers = [...mergedIntegers, ...integers];
                })
                .catch((error) => {
                    console.error(`Error retrieving data from ${url}: ${error.message}`);
                });
        } catch (error) {
            console.error(`Invalid URL: ${url}`);
        }
    });

    Promise.allSettled(promises)
        .then(() => {
            const uniqueIntegers = [...new Set(mergedIntegers)].sort((a, b) => a - b);
            res.json({ numbers: uniqueIntegers });
        })
        .catch((error) => {
            console.error(`Error merging integers: ${error.message}`);
            res.status(500).json({ error: 'Error merging integers' });
        });
});

app.listen(9090, () => {
    console.log('Server started on port 9090');
});