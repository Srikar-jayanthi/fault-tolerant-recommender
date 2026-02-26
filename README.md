# Fault-Tolerant Movie Recommendation System

A resilient microservices-based recommendation system demonstrating the **Circuit Breaker** pattern to prevent cascading failures in distributed environments.

## 🏗 Architecture

The system consists of four Node.js services:
- **`recommendation-service`**: Primary API and orchestrator. Implements custom Circuit Breaker logic.
- **`user-profile-service`**: Mock service providing user preferences (Controlled: normal/slow/fail).
- **`content-service`**: Mock service providing movie metadata based on genres (Controlled: normal/slow/fail).
- **`trending-service`**: Reliable fallback service providing generic trending movies.

## 🔌 Core Features

- **Failure Thresholds**: Opens after 5 consecutive timeouts (2s) or 50% failure rate over a 10-request window.
- **Graceful Degradation**: 
  - If `user-profile` fails: Uses default preferences (`["Comedy", "Family"]`).
  - If `content` fails: Returns an empty list but keeps `userPreferences`.
  - If both fail: Returns trending movies from `trending-service`.
- **Automatic Recovery**: Transitions from **OPEN** to **HALF-OPEN** after 30s, then **CLOSED** after 3 successful trial requests.

## 🚀 Getting Started

### 1. Prerequisites
- Docker & Docker Compose
- Node.js (for running verification tests)

### 2. Setup
```bash
# 1. Clone the repository
# 2. Setup environment variables
cp .env.example .env

# 3. Start the services
docker-compose up --build -d
```
The main API will be available at `http://localhost:8080`.

### 3. Verification
You can run the automated verification script:
```bash
npm install axios
node verify.js
```

## 📍 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/recommendations/:userId` | Primary endpoint for movie recommendations. |
| **POST** | `/simulate/:service/:behavior` | Set service behavior (`normal`, `slow`, `fail`). |
| **GET** | `/metrics/circuit-breakers` | View real-time stats and states of all breakers. |

## 🧪 Simulation Examples

**Simulate Failure:**
```bash
curl -X POST http://localhost:8080/simulate/user-profile/fail
```

**Simulate Latency:**
```bash
curl -X POST http://localhost:8080/simulate/content/slow
```

---
*Created as part of a Fault-Tolerant Distributed Systems project.*
