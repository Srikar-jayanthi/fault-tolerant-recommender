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

    // 2. Get Content (Movies)
    const recommendations = await contentCB.call(
        () => axios.get(`${contentUrl}/content`).then(r => r.data),
        () => {
            fallbackTriggered.push('content-service');
            return null; // Handle in next step
        }
    );

    // 3. Final Fallback Logic
    if (userProfileCB.state === 'OPEN' && contentCB.state === 'OPEN') {
        try {
            const trendingResponse = await axios.get(`${trendingUrl}/trending`);
            return res.json({
                message: "Our recommendation service is temporarily degraded. Here are some trending movies.",
                trending: trendingResponse.data,
                fallback_triggered_for: fallbackTriggered.join(', ')
            });
        } catch (e) {
            return res.status(500).json({ error: "Major system failure" });
        }
    }

    // If content failed but not user profile (or vice versa), return what we have
    if (recommendations === null) {
        // If content failed, we could try to filter trending movies by user preferences if we wanted to be fancy,
        // but the requirement says recommendations should be based on preferences.
        // For simplicity and adherence to requirement 8, if content is OPEN, we might show a partial response.
        // Requirement 9 says full fallback only when BOTH are open.
        // Requirement 8 says if user-profile is OPEN, use default preferences for recommendations.

        // Let's refine: if content is OPEN, we also trigger trending as fallback? 
        // Requirement 9: Scenario "Both OPEN" -> trending.
        // Requirement 8: Scenario "user-profile OPEN" -> default prefs + recommendations.

        // So if ONLY content is OPEN:
        return res.json({
            userPreferences: userProfile,
            recommendations: [], // Or trending? Requirement 9 says trending for BOTH. 
            // Requirement 8 implies we still return `userPreferences` and `recommendations`.
            fallback_triggered_for: fallbackTriggered.join(', ')
        });
    }

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
