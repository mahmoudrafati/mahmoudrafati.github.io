# 🚀 NLPDS Deployment Guide

This guide walks you through deploying the NLPDS Learning Platform with optional multi-user features.

## 📋 Deployment Options

### Option 1: Static Only (Original)
- ✅ GitHub Pages hosting
- ✅ No backend required
- ✅ All existing functionality
- ❌ No user accounts or sync

### Option 2: Full-Stack (New)
- ✅ GitHub Pages frontend
- ✅ Serverless backend (Vercel/Railway)
- ✅ User authentication & sync
- ✅ Leaderboard system

---

## 🎯 Static Deployment (GitHub Pages Only)

### 1. Prepare Repository

```bash
# Clone or fork the repository
git clone https://github.com/mahmoudrafati/NLPDS.git
cd NLPDS

# Remove backend folder if you don't need it
rm -rf backend/

# Commit changes
git add .
git commit -m "Deploy static version"
git push origin main
```

### 2. Enable GitHub Pages

1. Go to your repository on GitHub
2. Settings → Pages
3. Source: "Deploy from a branch"
4. Branch: `main` / `root`
5. Save

### 3. Access Your App

Your app will be available at:
```
https://USERNAME.github.io/REPOSITORY-NAME/
```

**That's it!** The app works completely client-side.

---

## 🔧 Full-Stack Deployment

### Phase 1: Backend Deployment

#### Prerequisites

- Node.js 18+ installed
- Vercel account (or Railway/Heroku)
- Git repository access

#### 1. Deploy Backend to Vercel

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (first time - follow prompts)
vercel

# Deploy to production
vercel --prod
```

#### 2. Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

| Variable | Value | Notes |
|----------|--------|-------|
| `JWT_SECRET` | `your-super-secret-key-here` | Generate a strong random string |
| `FRONTEND_URL` | `https://USERNAME.github.io/NLPDS` | Your GitHub Pages URL |
| `NODE_ENV` | `production` | Environment mode |
| `DATABASE_PATH` | `./database/nlpds.db` | SQLite database path |

#### 3. Test Backend

```bash
# Check health endpoint
curl https://your-backend.vercel.app/api/health

# Should return: {"status":"healthy",...}
```

#### 4. Initialize Database

```bash
# In the backend directory
npm run db:init

# This creates tables and a test user
```

### Phase 2: Frontend Configuration

#### 1. Update Frontend Config

Edit `js/config.js`:

```javascript
export const config = {
  // Update this with your actual backend URL
  API_BASE_URL: 'https://your-backend.vercel.app/api',
  
  // Enable features
  FEATURES: {
    USER_AUTHENTICATION: true,
    PROGRESS_SYNC: true,
    LEADERBOARD: true,
    GUEST_MODE: true
  }
};
```

#### 2. Deploy Frontend

```bash
# From project root
git add .
git commit -m "Configure backend integration"
git push origin main
```

GitHub Pages will automatically redeploy.

#### 3. Test Integration

1. Visit your GitHub Pages URL
2. Try registering a new account
3. Check if sync indicator appears
4. Test login/logout functionality

---

## ✅ Testing Checklist

### Backend Testing

- [ ] Health endpoint responds
- [ ] User registration works
- [ ] User login works
- [ ] Progress sync works
- [ ] Leaderboard API works
- [ ] CORS headers allow GitHub Pages

### Frontend Testing

- [ ] App loads without errors
- [ ] Guest mode still works
- [ ] Login modal appears
- [ ] Registration creates account
- [ ] Progress syncs across devices
- [ ] Leaderboard shows data
- [ ] Offline mode works

### Integration Testing

- [ ] Existing localStorage data migrates
- [ ] Cross-device sync works
- [ ] Backend unavailable gracefully handled
- [ ] No functionality lost for guest users

---

## 🔧 Troubleshooting

### Common Issues

#### Backend Not Accessible

**Problem**: CORS errors in browser console
```
Access to fetch at 'https://backend.vercel.app' from origin 'https://user.github.io' has been blocked by CORS policy
```

**Solution**: Check `FRONTEND_URL` environment variable in Vercel dashboard.

#### Database Issues

**Problem**: Database not found errors
```
SQLITE_CANTOPEN: unable to open database file
```

**Solution**: Redeploy after running `npm run db:init` locally, or check `DATABASE_PATH` environment variable.

#### Authentication Failing

**Problem**: JWT token errors
```
JsonWebTokenError: invalid signature
```

**Solution**: Verify `JWT_SECRET` is set correctly in Vercel environment variables.

### Debug Mode

Enable debug logging by adding to frontend config:
```javascript
export const config = {
  DEBUG: true,
  // ... other config
};
```

### Backend Logs

Check logs in Vercel Dashboard → Your Project → Functions → View Logs.

---

## 🚀 Alternative Hosting

### Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway deploy
```

### Heroku Deployment

```bash
# Install Heroku CLI and login
heroku login

# Create app and deploy
heroku create your-app-name
git push heroku main
```

### Custom Server

The backend is a standard Express.js app and can run anywhere:

```bash
# Set environment variables
export JWT_SECRET="your-secret"
export FRONTEND_URL="https://your-domain.com"

# Start server
npm start
```

---

## 📊 Monitoring & Maintenance

### Health Monitoring

Set up monitoring for:
- `GET /api/health` - Backend health
- User registration/login rates
- Database size growth
- API response times

### Database Maintenance

```bash
# Clean up old progress data (>90 days)
# This is handled automatically by the backend
```

### Backup

```bash
# Download database backup from Vercel
vercel env pull .env.local
vercel dev # To access file system
```

---

## 🎯 Performance Optimization

### Backend Optimization

- [ ] Enable response compression
- [ ] Set up CDN for static assets
- [ ] Implement database connection pooling
- [ ] Add caching for leaderboard queries

### Frontend Optimization

- [ ] Enable browser caching
- [ ] Minimize API calls
- [ ] Implement service worker for offline
- [ ] Optimize bundle size

---

## 🔐 Security Considerations

### Production Security

- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS everywhere
- [ ] Implement rate limiting
- [ ] Regular dependency updates
- [ ] Monitor for vulnerabilities

### Data Privacy

- [ ] Minimal data collection
- [ ] Clear privacy policy
- [ ] User data deletion option
- [ ] No sensitive data logging

---

## 📈 Scaling Considerations

### Database Scaling

For high usage, consider:
- PostgreSQL instead of SQLite
- Database connection pooling
- Read replicas for leaderboard
- Data archiving strategy

### Backend Scaling

- Vercel automatically scales
- Consider Redis for session storage
- API rate limiting per user
- Monitor function timeout limits

---

## 🆘 Emergency Procedures

### Backend Down

If backend fails:
1. App continues working in guest mode
2. Progress queued locally
3. Auto-syncs when backend returns
4. No functionality lost

### Data Recovery

SQLite database contains all user data:
1. Download from Vercel file system
2. Restore to new deployment
3. Users automatically reconnect

### Rollback

```bash
# Revert to previous Vercel deployment
vercel rollback

# Or redeploy specific version
vercel --prod --no-wait
```

---

**🎉 Congratulations!** You now have a fully deployed multi-user learning platform.

For questions or issues:
- Check the logs first
- Review this troubleshooting guide
- Open a GitHub issue for persistent problems
