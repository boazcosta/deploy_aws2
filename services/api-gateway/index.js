const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

app.use('/users', createProxyMiddleware({ target: 'http://user-service:3001', changeOrigin: true }));
app.use('/maps', createProxyMiddleware({ target: 'http://map-service:3002', changeOrigin: true }));
app.use('/analysis', createProxyMiddleware({ target: 'http://analysis-service:3003', changeOrigin: true }));

app.listen(3000, () => {
  console.log('API Gateway rodando na porta 3000');
});