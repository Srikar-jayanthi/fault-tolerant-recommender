class CircuitBreaker {
    constructor(name, options = {}) {
        this.name = name;
        this.timeout = options.timeout || 2000;
        this.failureThreshold = options.failureThreshold || 5; // failures to OPEN
        this.windowSize = options.windowSize || 10; // window for failure rate
        this.openDuration = options.openDuration || 30000; // time to stay OPEN
        this.halfOpenTrialCount = options.halfOpenTrialCount || 3;

        this.state = 'CLOSED';
        this.failures = 0;
        this.consecutiveTimeouts = 0;
        this.callHistory = []; // queue of boolean (true=success, false=fail)
        this.lastFailureTime = null;
        this.successfulTrialRequests = 0;
        this.stats = {
            successfulCalls: 0,
            failedCalls: 0
        };
    }

    async call(fn, fallback) {
        this.checkState();

        if (this.state === 'OPEN') {
            console.log(`[Circuit Breaker: ${this.name}] Short-circuiting call (OPEN state)`);
            return fallback();
        }

        try {
            const result = await this.executeWithTimeout(fn);
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error);
            return fallback();
        }
    }

    executeWithTimeout(fn) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('TIMEOUT'));
            }, this.timeout);

            fn().then(result => {
                clearTimeout(timer);
                resolve(result);
            }).catch(err => {
                clearTimeout(timer);
                reject(err);
            });
        });
    }

    onSuccess() {
        this.stats.successfulCalls++;
        this.callHistory.push(true);
        if (this.callHistory.length > this.windowSize) this.callHistory.shift();

        if (this.state === 'HALF_OPEN') {
            this.successfulTrialRequests++;
            if (this.successfulTrialRequests >= this.halfOpenTrialCount) {
                console.log(`[Circuit Breaker: ${this.name}] Transitioning to CLOSED`);
                this.reset();
            }
        } else {
            this.consecutiveTimeouts = 0;
        }
    }

    onFailure(error) {
        this.stats.failedCalls++;
        this.callHistory.push(false);
        if (this.callHistory.length > this.windowSize) this.callHistory.shift();

        if (error.message === 'TIMEOUT') {
            this.consecutiveTimeouts++;
        }

        if (this.state === 'CLOSED') {
            const failureCount = this.callHistory.filter(h => h === false).length;
            const failureRate = failureCount / this.callHistory.length;

            if (this.consecutiveTimeouts >= 5 || (this.callHistory.length >= this.windowSize && failureRate >= 0.5)) {
                this.openCircuit();
            }
        } else if (this.state === 'HALF_OPEN') {
            this.openCircuit();
        }
    }

    openCircuit() {
        console.log(`[Circuit Breaker: ${this.name}] Transitioning to OPEN`);
        this.state = 'OPEN';
        this.lastFailureTime = Date.now();
    }

    checkState() {
        if (this.state === 'OPEN' && (Date.now() - this.lastFailureTime) >= this.openDuration) {
            console.log(`[Circuit Breaker: ${this.name}] Transitioning to HALF_OPEN`);
            this.state = 'HALF_OPEN';
            this.successfulTrialRequests = 0;
        }
    }

    reset() {
        this.state = 'CLOSED';
        this.failures = 0;
        this.consecutiveTimeouts = 0;
        this.callHistory = [];
        this.successfulTrialRequests = 0;
    }

    getMetrics() {
        const failureCount = this.callHistory.filter(h => h === false).length;
        const failureRate = this.callHistory.length > 0
            ? ((failureCount / this.callHistory.length) * 100).toFixed(1) + '%'
            : '0.0%';

        return {
            state: this.state,
            failureRate: failureRate,
            successfulCalls: this.stats.successfulCalls,
            failedCalls: this.stats.failedCalls
        };
    }
}

module.exports = CircuitBreaker;
