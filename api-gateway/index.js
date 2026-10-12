require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const verifyToken = require('./middleware/verifyToken');

const app = express();

// ---------- public routes (no token needed) ----------
app.use('/register', createProxyMiddleware({
  target: process.env.REGISTER_SERVICE_URL,
  changeOrigin: true
}));

app.use('/auth', createProxyMiddleware({
  target: process.env.LOGIN_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/': '/auth/' }
}));

// ---------- employer-only routes ----------
app.use('/employer/jobs', verifyToken('employer'), createProxyMiddleware({
  target: process.env.JOB_LISTING_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/': '/jobs/' }
}));

app.use('/employer/applications', verifyToken('employer'), createProxyMiddleware({
  target: process.env.APPLICANT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/': '/applications/' }
}));

// ---------- seeker-only routes ----------
app.use('/seeker/jobs', verifyToken('seeker'), createProxyMiddleware({
  target: process.env.JOB_SEARCH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/': '/jobs/' }
}));

app.use('/seeker/applications', verifyToken('seeker'), createProxyMiddleware({
  target: process.env.APPLICATION_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/': '/applications/' }
}));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});