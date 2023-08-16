const express = require('express');
const googleTrends = require('google-trends-api');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/trends', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).send('Missing query parameter');
    }
    
    const trendData = await fetchGoogleTrendsData(query);
    if (trendData) {
      res.json(trendData);
    } else {
      res.status(500).send('Error fetching trends');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

async function fetchGoogleTrendsData(query) {
  try {
    const trendData = await googleTrends.interestOverTime({
      keyword: query,
      startTime: new Date(Date.now() - 31536000000), // Начало за последний год
      granularTimeResolution: true
    });

    return JSON.parse(trendData);
  } catch (error) {
    console.error('Error fetching Google Trends data:', error);
    return null;
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

