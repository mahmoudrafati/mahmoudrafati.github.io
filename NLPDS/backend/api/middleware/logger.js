/**
 * Request logging middleware
 */

export function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Skip logging for health checks
  if (req.path === '/api/health' || req.path === '/') {
    return next();
  }

  // Log request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusEmoji = res.statusCode >= 400 ? '❌' : '✅';
    
    console.log(
      `${statusEmoji} ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
}
