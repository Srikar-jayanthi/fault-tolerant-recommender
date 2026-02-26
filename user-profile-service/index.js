const express = require('express');
const app = express();
const port = process.env.PORT || 8081;

let behavior = 'normal';

app.use(express.json());

app.post('/behavior', (req, res) => {
  behavior = req.body.behavior;
  console.log(`User Profile Service behavior set to: ${behavior}`);
  res.sendStatus(200);
});

app.get('/user/:userId', async (req, res) => {
  if (behavior === 'fail') {
    return res.status(500).json({ error: 'Internal Server Error' });
  }

  if (behavior === 'slow') {
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  res.json({
    userId: req.params.userId,
    preferences: ["Action", "Sci-Fi"]
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`User Profile Service listening at http://localhost:${port}`);
});
