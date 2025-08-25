# NLPDS Backend - Authentication & Progress Tracking

Serverless backend for the NLPDS Learning Platform, providing user authentication, progress synchronization, and leaderboard functionality.

## 🚀 Quick Start

### Local Development

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize database**
   ```bash
   npm run db:init
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000`

### Production Deployment (Vercel)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

3. **Set environment variables in Vercel dashboard**
   - `JWT_SECRET` - Strong secret for JWT tokens
   - `FRONTEND_URL` - Your GitHub Pages URL
   - `DATABASE_PATH` - For persistent storage

## 📊 Database Schema

The backend uses SQLite with the following tables:

- **users** - User accounts and preferences
- **user_progress** - Individual question answers and scores
- **learning_sessions** - Learning session metadata
- **leaderboard_cache** - Precomputed leaderboard rankings

## 🔐 Authentication

### Registration
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123",
  "email": "test@example.com",
  "displayName": "Test User"
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

Returns JWT token for subsequent requests.

## 📈 Progress Tracking

### Save Answer
```http
POST /api/progress/answer
Authorization: Bearer <token>
Content-Type: application/json

{
  "questionId": "q1",
  "userAnswer": "The answer is...",
  "score": 0.85,
  "correct": true,
  "hintsUsed": 1,
  "timeSpent": 45000,
  "sessionMode": "learn",
  "evaluationData": { ... }
}
```

### Bulk Sync (for migration)
```http
POST /api/progress/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "progressData": [
    {
      "questionId": "q1",
      "userAnswer": "...",
      "score": 0.85,
      "correct": true,
      "sessionMode": "learn"
    }
  ]
}
```

## 🏆 Leaderboard

### Get Leaderboard
```http
GET /api/leaderboard/weekly?limit=50
```

Returns ranked users with scores and statistics.

### Scoring Algorithm
- **Accuracy (40%)** - Average score across all attempts
- **Consistency (30%)** - Regular usage and streak bonuses
- **Completion (20%)** - Number of questions completed
- **Efficiency (10%)** - Time spent vs. performance

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `DATABASE_PATH` | SQLite database path | `./database/nlpds.db` |
| `FRONTEND_URL` | GitHub Pages URL | Required |
| `CORS_ORIGINS` | Allowed CORS origins | Frontend URL |

### CORS Configuration

The backend is configured to work with GitHub Pages frontends:

```javascript
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:8000',
    /^https:\/\/.*\.github\.io$/
  ],
  credentials: true
};
```

## 🛠️ Development

### Database Management

```bash
# Initialize fresh database
npm run db:init

# This creates:
# - All required tables
# - Indexes for performance
# - Test user (development only)
```

### Testing

```bash
# Run tests
npm test

# Test individual endpoints
curl -X GET http://localhost:3000/api/health
```

### Debugging

Set `DEBUG=true` in your environment for verbose logging.

## 📱 Frontend Integration

### Update Frontend Configuration

In your frontend `js/config.js`:

```javascript
export const config = {
  API_BASE_URL: 'https://your-backend.vercel.app/api',
  // ... other config
};
```

### Existing Code Compatibility

The backend is designed to work with your existing localStorage-based frontend:

1. **Authentication is optional** - guest mode still works
2. **Progress migration** - existing localStorage data is automatically synced
3. **Offline capability** - progress is queued and synced when online
4. **Non-intrusive UI** - new features don't interfere with existing workflow

## 🚀 Deployment Checklist

### Vercel Deployment

1. ✅ **Set up Vercel project**
2. ✅ **Configure environment variables**
3. ✅ **Deploy backend**
4. ✅ **Update frontend config with backend URL**
5. ✅ **Test authentication flow**
6. ✅ **Verify progress sync**
7. ✅ **Check leaderboard functionality**

### DNS & CORS

Make sure to:
- Add your GitHub Pages domain to `CORS_ORIGINS`
- Test cross-origin requests work properly
- Verify JWT tokens persist across sessions

## 📊 Monitoring

### Health Check
```http
GET /api/health
```

Returns server status and environment info.

### Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error type",
  "message": "Human-readable message",
  "details": [...] // Optional validation details
}
```

## 🔐 Security Notes

### Authentication Security
- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with 7-day expiration
- Rate limiting on auth endpoints (10 requests/15min)
- Input validation on all endpoints

### Data Privacy
- Minimal data collection (username, progress only)
- Leaderboard participation is opt-in
- Users can delete their data by opting out
- No sensitive personal information stored

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Test your changes locally
4. Submit a pull request

## 📞 Support

For issues with the backend:

1. Check logs in Vercel dashboard
2. Verify environment variables are set
3. Test API endpoints directly
4. Check CORS configuration

## 🔄 Migration Guide

### From Pure Frontend to Full-Stack

Your existing app will continue to work exactly as before. New features:

1. **Optional registration** - users can create accounts for sync
2. **Automatic migration** - existing progress is preserved and synced
3. **Hybrid mode** - works offline and online seamlessly
4. **Progressive enhancement** - features unlock as users authenticate

No existing functionality is broken or changed!
