# Notes

## Installation and start

```bash
npm install
npm run start:dev
```

## Check setup

Navigate to: <http://localhost:6060/api/> and API swagger should appear

## Login bearer token

[GET] /api/v1/google-login to access the bearer token from the backend console. You will need to gain admin privileges dricetly from database. Reach out to an admin.


## to deploy react: 
To achieve this, you can follow these steps:

1. **Build the React frontend**: First, make sure to build your React application. In your React project directory, run the following command:

   ```
   npm run build
   ```

   This command will create a `build` folder containing the production-ready, minified version of your frontend application.

2. **Copy the build folder**: Copy the `build` folder from your React project to the root of your NestJS project.

3. **Serve the React frontend in NestJS**: In your NestJS application, you can serve static files (like your React app) using the built-in `serve-static` module. Install it using the following command:

   ```
   npm install --save @nestjs/serve-static
   ```

4. **Update NestJS `main.ts`**: Update your `main.ts` file in your NestJS project to serve the React app as static files. Add the following lines before calling `app.listen()`:

   ```javascript
   import { ServeStaticModule } from '@nestjs/serve-static';
   import { join } from 'path';

   // ...

   const frontendPath = join(__dirname, '..', 'build');
   app.useStaticAssets(frontendPath);
   ```

   Replace `'..'` with the appropriate path if you placed the `build` folder in a different location in your NestJS project.

5. **Configure routing**: Make sure that your NestJS routes do not conflict with your React app routes. NestJS will serve your React app at the root path `/`, so your API routes should be prefixed with something like `/api`. You already have `app.setGlobalPrefix('api/v1')` in your `main.ts`, so this should be fine.

Once you've completed these steps, your React frontend should be served alongside your NestJS backend, and you should be able to make API calls from the frontend to the backend using relative URLs like `/api/v1/...`.

Note that this setup is suitable for development and simple deployments. For more complex deployments, you might want to consider serving your frontend and backend separately using a reverse proxy like Nginx, or hosting your frontend on a CDN.

## to deploy backend to GCP
npm run build
gcloud app deploy

## See logs
$  gcloud app logs tail -s default