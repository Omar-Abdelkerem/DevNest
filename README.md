# DevNest

DevNest is a backend API for a developer portfolio and project-sharing platform. It is designed for developers to showcase work, manage profiles, publish projects, highlight skills, and interact with project discussions through a clean REST API.

The application uses PostgreSQL as its primary database and Redis for caching and fast in-memory data access.

## Overview

This project focuses on building a scalable backend for a modern portfolio ecosystem. The platform allows users to:

- create and manage personal developer profiles
- publish and update projects
- organize skills and technical experience
- leave comments on project entries
- authenticate securely with JWT-based access control
- persist data in PostgreSQL using Prisma ORM
- use Redis for caching and fast data access

## Why this project exists

Many developer portfolios are limited to static frontends or personal websites. DevNest aims to provide a practical backend foundation where user data, portfolio projects, and skill metadata are managed through a structured API that can be connected to a frontend or mobile client.

## Core Features

- Secure user registration and login
- Password hashing with bcrypt
- JWT-based authorization middleware
- Project CRUD operations
- Skill and profile management
- Comment support for projects
- Redis caching
- Rate limiting and security headers
- Validation with Zod schemas
- Database modeling with Prisma
- Automated tests with Jest and Supertest

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- Redis
- JWT authentication
- bcrypt
- Zod
- Helmet and CORS
- Jest + Supertest
- Docker
- Docker Compose

## Project Structure

- `src/app.js` — application bootstrap and middleware setup
- `src/server.js` — server startup and port configuration
- `src/controller` — business logic for API routes
- `src/routes` — route definitions for auth, users, projects, skills, and comments
- `src/middleware` — request validation, auth checks, and error handling
- `src/schemas` — Zod validation schemas
- `prisma/schema.prisma` — database schema
- `tests/` — automated unit and integration tests

## Prerequisites

Before running the project, make sure you have:

- Docker
- Docker Compose
- Git

Node.js, PostgreSQL, and Redis do not need to be installed separately when using Docker Compose.

## Environment Configuration

Create a `.env` file in the root of the project.

Example:

```env
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=devnest_db

DATABASE_URL=postgresql://your_database_user:your_database_password@localhost:5432/devnest_db

REDIS_URL=redis://redis:6379

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=30d
PORT=3000
```
