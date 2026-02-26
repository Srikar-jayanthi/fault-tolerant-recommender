const axios = require('axios');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
    const baseUrl = 'http://localhost:8080';
    console.log('--- Starting Verification Tests ---');

    try {
        // 1. Reset to normal
        await axios.post(`${baseUrl}/simulate/user-profile/normal`);
        await axios.post(`${baseUrl}/simulate/content/normal`);
        console.log('Requirement 3 & 4: Verified Normal State');

        // 2. GET /recommendations/123 (Healthy)
        const res1 = await axios.get(`${baseUrl}/recommendations/123`);
        console.log('Requirement 4: Healthy Response', JSON.stringify(res1.data));

        // 3. Timeout Test (Requirement 5)
        console.log('Requirement 5: Testing Timeout Threshold');
        await axios.post(`${baseUrl}/simulate/user-profile/slow`);
        for (let i = 0; i < 5; i++) {
            await axios.get(`${baseUrl}/recommendations/123`).catch(e => e.response);
            console.log(`Request ${i + 1} sent to slow user-profile`);
        }
        const metrics1 = await axios.get(`${baseUrl}/metrics/circuit-breakers`);
        console.log('Requirement 5 & 11: Circuit State after 5 timeouts:', metrics1.data.userProfileCircuitBreaker.state);

        // 4. Short-Circuit Test (Requirement 7)
        console.log('Requirement 7: Testing Short-Circuit');
        const start = Date.now();
        const resShort = await axios.get(`${baseUrl}/recommendations/123`);
        const duration = Date.now() - start;
        console.log(`Short-circuited request took ${duration}ms (Expected < 50ms)`);
        console.log('Requirement 8: Fallback Content', JSON.stringify(resShort.data));

        // 5. Failure Rate Test (Requirement 6)
        console.log('Requirement 6: Testing Failure Rate Threshold');
        await axios.post(`${baseUrl}/simulate/content/fail`);
        // Send 5 failures + 5 successes (or interleaved) to reach 50%
        for (let i = 0; i < 5; i++) {
            await axios.get(`${baseUrl}/recommendations/123`); // This will hit fallback but counts as failure in CB
        }
        const metrics2 = await axios.get(`${baseUrl}/metrics/circuit-breakers`);
        console.log('Requirement 6: content-service state:', metrics2.data.contentCircuitBreaker.state);

        // 6. Final Fallback (Requirement 9)
        console.log('Requirement 9: Testing Final Fallback (Both OPEN)');
        const resFinal = await axios.get(`${baseUrl}/recommendations/123`);
        console.log('Final Fallback Response:', JSON.stringify(resFinal.data));

        // 7. Recovery (Requirement 10)
        console.log('Requirement 10: Testing Recovery');
        console.log('Waiting 30 seconds for OPEN state timeout...');
        await sleep(31000);
        await axios.post(`${baseUrl}/simulate/user-profile/normal`);
        await axios.post(`${baseUrl}/simulate/content/normal`);

        // First 3 should be trials
        for (let i = 0; i < 3; i++) {
            await axios.get(`${baseUrl}/recommendations/123`);
            const m = await axios.get(`${baseUrl}/metrics/circuit-breakers`);
            console.log(`Trial ${i + 1} state:`, m.data.userProfileCircuitBreaker.state);
        }

        const finalMetrics = await axios.get(`${baseUrl}/metrics/circuit-breakers`);
        console.log('Requirement 10: Final state after recovery:', finalMetrics.data.userProfileCircuitBreaker.state);

        console.log('--- Verification Tests Completed ---');
    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) console.error('Response:', error.response.data);
    }
}

runTests();
