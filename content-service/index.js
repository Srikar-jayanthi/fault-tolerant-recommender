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

const movies = [
    { movieId: 101, title: "Inception", genre: "Sci-Fi" },
    { movieId: 102, title: "The Dark Knight", genre: "Action" },
    { movieId: 103, title: "Superbad", genre: "Comedy" },
    { movieId: 104, title: "The Hangover", genre: "Comedy" },
    { movieId: 105, title: "The Lion King", genre: "Family" },
    { movieId: 106, title: "Toy Story", genre: "Family" },
    { movieId: 107, title: "Interstellar", genre: "Sci-Fi" },
    { movieId: 108, title: "Mad Max: Fury Road", genre: "Action" }
];

app.get('/content', async (req, res) => {
    if (behavior === 'fail') {
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (behavior === 'slow') {
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    const genres = req.query.genres ? req.query.genres.split(',') : [];

    let filteredMovies = movies;
    if (genres.length > 0) {
        filteredMovies = movies.filter(m => genres.includes(m.genre));
    }

    // Ensure we don't return an empty list if possible, or just follow genres
    res.json(filteredMovies);
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(port, () => {
    console.log(`Content Service listening at http://localhost:${port}`);
});
