# QV-System React Frontend

## Overview

The QV-System React Frontend is a modern web application that provides the user interface for the Quadratic Voting System. It enables users to:

- Create and manage surveys with multiple question types
- Participate in surveys using Quadratic Voting, Likert scale, and text questions
- Visualize and analyze survey results in real time
- Organize and categorize voting options for better data insight

---

## Prerequisites

- **Node.js** v16+ (recommend using [nvm](https://github.com/nvm-sh/nvm))
- **npm** v8+

---

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone <repo-url>
   cd QV-System-React-Frontend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment:**

   - Edit `src/config.ts` to set the backend API URL and any other environment variables as needed.
   - Example:
     ```typescript
     // src/config.ts
     export const API_BASE_URL = 'http://localhost:4000/api';
     ```

4. **Start the backend:**

   - Ensure the backend API is running (see backend README for instructions).

5. **Run the frontend:**

   ```bash
   npm run start
   ```
   The app will be available at [http://localhost:3000](http://localhost:3000).

6. **Build for production:**

   ```bash
   npm run build
   ```
   The production build will be output to the `build` folder.

---

## Project Structure

- `src/components/` - Reusable UI components
  - `VoteSelection/` - Quadratic voting interface
  - `Category/` - Option categorization UI
  - `Instructions/` - User guidance components
- `src/features/` - Redux state management (slices for questions, options, metadata, auth)
- `src/pages/` - Main application views
  - `survey/` - Survey taking/editing interfaces
  - `designer/` - Survey creation tools
  - `home/` - Landing page

---

## Technology Stack

- React (with TypeScript)
- Redux Toolkit for state management
- CSS Modules for styling
- React Router for navigation

---

## Scripts

- `npm run start` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests (if available)
- `npm run lint` - Lint the codebase

---

## Connecting to Backend

The frontend connects to the backend API using configuration in `src/config.ts`. Ensure the backend is running before starting the frontend. Update the API URL as needed for your environment.

---

## Contribution Guidelines

Contributions are welcome! Please open an issue or submit a pull request. For major changes, discuss them in an issue first.

---

## Troubleshooting

- **Port conflicts:** Make sure ports 3000 (frontend) and 4000 (backend) are available.
- **API connection issues:** Verify the backend URL in `src/config.ts` matches your backend server.
- **Dependency issues:** Delete `node_modules` and run `npm install` again.

---

## License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0). You are free to use, share, and adapt this work for non-commercial purposes as long as you provide attribution to the original creator.

---

## Contact

For questions or support, please contact the project maintainer or open an issue on GitHub.