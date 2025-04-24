# QV-System Backend

## Description

The QV-System Backend is a NestJS application that provides the API for the Quadratic Voting System. It handles:

- User authentication and authorization
- Survey and question management (QV, Likert, Text)
- Response collection and processing
- Data storage with MongoDB

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development with watch mode (recommended for development)
$ npm run start:dev

# standard development mode
$ npm run start

# production mode
$ npm run start:prod
```

## Testing

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## API Structure

- `/api/v1/auth` - Authentication endpoints
- `/api/v1/questions` - Question management endpoints
- `/api/v1/surveys` - Survey management endpoints
- `/api/v1/response` - Response management endpoints

## Technology Stack

- [NestJS](https://nestjs.com/) - A progressive Node.js framework
- MongoDB with Mongoose - Database layer
- JWT - Authentication
- Google OAuth - Social login

## License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0). You are free to use, share, and adapt this work for non-commercial purposes as long as you provide attribution to the original creator.