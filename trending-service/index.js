const express = require('express');
const app = express();
const port = process.env.PORT || 8083;

app.get('/trending', (req, res) => {
    res.json([
        { movieId: 99, title: "Trending Movie 1" },
        { movieId: 98, title: "Trending Movie 2" }
    ]);
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(port, () => {
    console.log(`Trending Service listening at http://localhost:${port}`);
});
