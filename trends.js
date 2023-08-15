const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/trends', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).send('Missing query parameter');
    }

    const trends = await fetchGoogleTrendsData(query);
    if (trends) {
      const trendNames = trends.map(trend => trend.name).join(', ');
      res.send(`Trends: ${trendNames}`);
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
    const response = await axios.post('https://trends.google.com/trends/api/explore', {
      hl: 'en-US',
      tz: -120,
      req: {
        comparisonItem: [{ keyword: query, geo: '', time: 'today 5-y' }],
        category: 0,
        property: ''
      }
    });

    const jsonData = JSON.parse(response.data.slice(5));
    const trendData = jsonData.default.timelineData.map(item => ({
      date: new Date(item.time * 1000),
      value: item.value[0]
    }));

    return trendData;
  } catch (error) {
    console.error('Error fetching Google Trends data:', error);
    return null;
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
