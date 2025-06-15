# Railway Deployment Guide

## Quick Deploy

1. **Create Railway Project**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and create project
   railway login
   railway init
   ```

2. **Set up PostgreSQL**:
   ```bash
   # Add PostgreSQL service
   railway add postgresql
   ```

3. **Deploy Application**:
   ```bash
   # Deploy the web service
   railway up
   ```

4. **Initialize Database**:
   ```bash
   # Set DATABASE_URL in Railway dashboard, then run:
   railway run npm run db:setup
   railway run npm run db:migrate
   ```

## Environment Variables

Required variables in Railway:
- `DATABASE_URL` - Automatically set by PostgreSQL service
- `NODE_ENV=production`

## Database Setup Commands

- `npm run db:setup` - Creates database schema
- `npm run db:migrate` - Migrates all 51 Meteor debates
- `npm run deploy:prepare` - Runs both setup and migration

## Services Configuration

The application uses:
- **Web Service**: Next.js application on port 3000
- **PostgreSQL Service**: Database for debate storage
- **Health Check**: `/api/health` endpoint for monitoring

## Post-Deploy

After deployment:
1. Visit your Railway URL to confirm the app is running
2. Check `/api/health` for service status
3. Visit `/library` to browse the 51 Meteor debates
4. Test creating new debates via the main interface