# Fault-Tolerant Recommendation Service

This project implements a microservices-based movie recommendation system using the **Circuit Breaker** pattern to handle cascading failures.

## Architecture

- **recommendation-service**: Main entry point, implements Circuit Breaker.
- **user-profile-service**: Mock service for user data.
- **content-service**: Mock service for movie metadata.
- **trending-service**: Reliable fallback service.

## Setup

1. Copy `.env.example` to `.env`.
2. Run `docker-compose up --build`.
3. The API will be available at `http://localhost:8080`.

## Endpoints

- `GET /recommendations/:userId`: Get movie recommendations.
- `POST /simulate/:service/:behavior`: Control dependency behavior (`normal`, `slow`, `fail`).
- `GET /metrics/circuit-breakers`: View current state and stats of all circuit breakers.

## Circuit Breaker Configuration

- **Timeout**: 2 seconds.
- **Failure Threshold (Consecutive Timeouts)**: 5.
- **Failure Rate Threshold**: 50% over a 10-request window.
- **OPEN Duration**: 30 seconds.
- **HALF-OPEN Trial Requests**: 3.
