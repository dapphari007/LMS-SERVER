# Railway Deployment Guide

This guide explains how to deploy this server application to Railway.

## Prerequisites

1. A Railway account (sign up at [railway.app](https://railway.app) if you don't have one)
2. Railway CLI installed (optional, but recommended)
3. Git repository for your project

## Deployment Steps

### Option 1: Using the Railway Dashboard

1. Log in to your Railway account
2. Click "New Project" and select "Deploy from GitHub repo"
3. Connect your GitHub account if you haven't already
4. Select this repository
5. Railway will automatically detect the Dockerfile and use it for deployment
6. Configure environment variables in the Railway dashboard:
   - DATABASE_URL: Your PostgreSQL connection string
   - JWT_SECRET: Secret key for JWT authentication
   - (Add any other environment variables your application needs)
7. Deploy the project

### Option 2: Using the Railway CLI

1. Install the Railway CLI:
   ```
   npm install -g @railway/cli
   ```

2. Log in to your Railway account:
   ```
   railway login
   ```

3. Initialize a new project (if you haven't already):
   ```
   railway init
   ```

4. Link to an existing project (if you already created one in the dashboard):
   ```
   railway link
   ```

5. Deploy your application:
   ```
   railway up
   ```

### Option 3: Using the Deployment Scripts

We've added deployment scripts to the package.json file to make deployment easier:

1. Make your changes to the codebase
2. Run the deployment script:
   ```
   npm run deploy
   ```

3. If you need to force push (use with caution):
   ```
   npm run deploy:force
   ```

## Environment Variables

Make sure to set the following environment variables in your Railway project:

- `DATABASE_URL`: Your PostgreSQL connection string (Railway automatically provides this when you add a PostgreSQL database to your project)
- `JWT_SECRET`: Secret key for JWT authentication (generate a strong random string)
- `NODE_ENV`: Set to "production" for production deployment

If you're not using the `DATABASE_URL` provided by Railway, you can set these individual database connection variables instead:

- `DB_HOST`: Database host
- `DB_PORT`: Database port
- `DB_USERNAME`: Database username
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name

## Troubleshooting

If you encounter any issues during deployment:

1. Check the Railway logs in the dashboard
2. Verify that all required environment variables are set
3. Ensure your Dockerfile is correctly configured
4. Check that your application is listening on the port provided by Railway (`process.env.PORT`)

### Common Issues

#### Missing Dependencies (e.g., reflect-metadata)

If you see errors like `Error: Cannot find module 'reflect-metadata'` in your logs:

1. Make sure the dependency is listed in your `package.json`
2. Check that your Dockerfile doesn't have a `npm ci --only=production` step after the build step, as this can cause issues with TypeORM dependencies
3. Ensure your Dockerfile uses a simple `npm install` to install all dependencies
4. If using TypeORM, make sure `reflect-metadata` is imported at the top of your entry file

## Monitoring

Railway provides built-in monitoring for your deployed applications. You can view logs, metrics, and more from the Railway dashboard.

## Recent Fixes

The following issues have been fixed to ensure smooth deployment to Railway:

1. **Missing reflect-metadata module**: Updated the Dockerfile to properly install all dependencies and removed the problematic `npm ci --only=production` step.

2. **Database connection**: Added support for the `DATABASE_URL` environment variable that Railway automatically provides when you add a PostgreSQL database to your project.

3. **Environment variables**: Updated the configuration to use environment variables for database connection, making it more flexible for different deployment environments.

If you encounter any other issues during deployment, please check the logs and refer to the troubleshooting section above.