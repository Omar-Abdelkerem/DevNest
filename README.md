# DevNest

DevNest is a backend API for a developer portfolio and project-sharing platform. It is designed for developers to showcase work, manage profiles, publish projects, highlight skills, and interact with project discussions through a clean REST API.

## Overview

This project focuses on building a scalable backend for a modern portfolio ecosystem. The platform allows users to:

- create and manage personal developer profiles
- publish and update projects
- organize skills and technical experience
- leave comments on project entries
- authenticate securely with JWT-based access control
- persist data in PostgreSQL using Prisma ORM

## Why this project exists

Many developer portfolios are limited to static frontends or personal websites. DevNest aims to provide a practical backend foundation where user data, portfolio projects, and skill metadata are managed through a structured API that can be connected to a frontend or mobile client.

## Core Features

- Secure user registration and login
- Password hashing with bcrypt
- JWT-based authorization middleware
- Project CRUD operations
- Skill and profile management
- Comment support for projects
- Rate limiting and security headers
- Validation with Zod schemas
- Database modeling with Prisma
- Automated tests with Jest and Supertest

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- JWT authentication
- bcrypt
- Zod
- Helmet and CORS
- Jest + Supertest

## Project Structure

- src/app.js — application bootstrap and middleware setup
- src/server.js — server startup and port configuration
- src/controller — business logic for API routes
- src/routes — route definitions for auth, users, projects, skills, and comments
- src/middleware — request validation, auth checks, and error handling
- src/schemas — Zod validation schemas
- prisma/schema.prisma — database schema
- tests/ — automated unit and integration tests

## Prerequisites

Before running the project locally, make sure you have:

- Node.js 22 or newer
- PostgreSQL installed and running
- npm installed
- access to a local or remote PostgreSQL database

## Environment Configuration

Create a .env file in the root of the project with values similar to the following:

PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/devnest"
JWT_SECRET="your_jwt_secret_here"

Important:

- do not commit your .env file to source control
- use a strong secret for JWT signing
- ensure the database is accessible before starting the service

## Installation

1. Clone the repository.
2. Install dependencies:

   npm install

3. Set up the environment variables in .env.
4. Generate the Prisma client:

   npx prisma generate

5. Run database migrations:

   npx prisma migrate dev

## Running the Application

Start the development server:

npm run dev

Start the server in production-like mode:

npm start

The server listens on the port defined by PORT, defaulting to 3000.

## API Overview

The application exposes routes under the following base path:

/api/v1

Common endpoints include:

- /api/v1/auth
- /api/v1/user
- /api/v1/projects
- /api/v1/skills
- /api/v1/comments

## Testing

Run the automated tests with:

npm test

This project uses Jest with Supertest to verify API behavior and authentication flows.

## Security Notes

- passwords are hashed before storage
- JWT tokens are used for protected API access
- input validation is enforced through Zod
- rate limiting and HTTP headers reduce basic abuse risk

## Database Notes

The project uses Prisma with PostgreSQL. If you modify the schema, update the database by running:

npx prisma generate
npx prisma migrate dev

## License

This project is licensed under the ISC license.

## Status

This repository is a backend-focused DevNest application intended to support a portfolio platform with a structured API foundation.
