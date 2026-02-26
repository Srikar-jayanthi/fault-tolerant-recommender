const express = require('express');
const app = express();
const port = process.env.PORT || 8082;

let behavior = 'normal';

app.use(express.json());

app.post('/behavior', (req, res) => {
    behavior = req.body.behavior;
    console.log(`Content Service behavior set to: ${behavior}`);
    res.sendStatus(200);
});

app.get('/content', async (req, res) => {
    if (behavior === 'fail') {
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (behavior === 'slow') {
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    res.json([
        { movieId: 101, title: "Inception", genre: "Sci-Fi" },
        { movieId: 102, title: "The Dark Knight", genre: "Action" }
    ]);
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(port, () => {
    console.log(`Content Service listening at http://localhost:${port}`);
});
