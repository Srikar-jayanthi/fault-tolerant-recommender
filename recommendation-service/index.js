const express = require('express');
const axios = require('axios');
const CircuitBreaker = require('./CircuitBreaker');
const app = express();
const port = process.env.API_PORT || 8080;

app.use(express.json());

const userProfileUrl = process.env.USER_PROFILE_URL || 'http://user-profile-service:8081';
const contentUrl = process.env.CONTENT_URL || 'http://content-service:8082';
const trendingUrl = process.env.TRENDING_URL || 'http://trending-service:8083';

// Initialize Circuit Breakers
const userProfileCB = new CircuitBreaker('user-profile-service');
const contentCB = new CircuitBreaker('content-service');

// Health endpoint
app.get('/health', (req, res) => res.status(200).send('OK'));

// Simulation Control Endpoints
app.post('/simulate/:service/:behavior', async (req, res) => {
    const { service, behavior } = req.params;
    let targetUrl;

    if (service === 'user-profile') targetUrl = userProfileUrl;
    else if (service === 'content') targetUrl = contentUrl;
    else return res.status(400).json({ error: 'Invalid service name' });

    try {
        await axios.post(`${targetUrl}/behavior`, { behavior });
        res.json({ message: `Service ${service} set to ${behavior}` });
    } catch (error) {
        res.status(500).json({ error: `Failed to update ${service} behavior` });
    }
});

// Main Recommendation Endpoint
app.get('/recommendations/:userId', async (req, res) => {
    const userId = req.params.userId;
    let fallbackTriggered = [];

    // 1. Get User Profile
    const userProfile = await userProfileCB.call(
        () => axios.get(`${userProfileUrl}/user/${userId}`).then(r => r.data),
        () => {
            fallbackTriggered.push('user-profile-service');
            return { userId, preferences: ["Comedy", "Family"] }; // Default preferences
        }
    );

    // 2. Combined Fallback Check (Requirement 9)
    // If BOTH are OPEN, we should fail-fast to trending
    if (userProfileCB.state === 'OPEN' && contentCB.state === 'OPEN') {
        try {
            const trendingResponse = await axios.get(`${trendingUrl}/trending`);
            return res.json({
                message: "Our recommendation service is temporarily degraded. Here are some trending movies.",
                trending: trendingResponse.data,
                fallback_triggered_for: "user-profile-service, content-service"
            });
        } catch (e) {
            return res.status(500).json({ error: "Major system failure" });
        }
    }

    // 3. Get Content (Movies) based on preferences
    const queryParams = userProfile.preferences ? `?genres=${userProfile.preferences.join(',')}` : '';
    const recommendations = await contentCB.call(
        () => axios.get(`${contentUrl}/content${queryParams}`).then(r => r.data),
        () => {
            if (!fallbackTriggered.includes('content-service')) {
                fallbackTriggered.push('content-service');
            }
            return [];
        }
    );

    // 4. Handle Content Fallback ONLY if it was triggered
    // Requirement 8 covers user-profile OPEN. 
    // If BOTH were OPEN, we already returned.
    // If ONLY user-profile was OPEN, we used default prefs and got recommendations (or empty).
    // If ONLY content was OPEN, recommendations is [].

    res.json({
        userPreferences: userProfile,
        recommendations: recommendations,
        fallback_triggered_for: fallbackTriggered.length > 0 ? fallbackTriggered.join(', ') : undefined
    });
});

// Metrics Endpoint
app.get('/metrics/circuit-breakers', (req, res) => {
    res.json({
        userProfileCircuitBreaker: userProfileCB.getMetrics(),
        contentCircuitBreaker: contentCB.getMetrics()
    });
});

app.listen(port, () => {
    console.log(`Recommendation Service listening at http://localhost:${port}`);
});
