// Simple CORS proxy for Google Apps Script
const http = require('http');
const https = require('https');

const GAS_URL = 'https://script.google.com/macros/s/AKfycbz7UppWk0ye6dV1zPqmdyLZBBxceP_cmop17GhW4i_FqCMtaJImzcpMdmygjbrMYVDf/exec';
const PORT = 3000;

http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const query = req.url.substring(1);
    const targetUrl = `${GAS_URL}?${query}`;
    
    console.log(`📨 ${req.method} /${query}`);
    
    if (req.method === 'GET') {
        https.get(targetUrl, (gasRes) => {
            let data = '';
            gasRes.on('data', chunk => data += chunk);
            gasRes.on('end', () => {
                console.log(`✅ ${gasRes.statusCode}`);
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(data);
            });
        }).on('error', err => {
            console.error('❌', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: err.message }));
        });
    } else if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            };
            
            const proxyReq = https.request(targetUrl, options, (gasRes) => {
                let data = '';
                gasRes.on('data', chunk => data += chunk);
                gasRes.on('end', () => {
                    console.log(`✅ ${gasRes.statusCode}`);
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(data);
                });
            });
            
            proxyReq.on('error', err => {
                console.error('❌', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: err.message }));
            });
            
            proxyReq.write(body);
            proxyReq.end();
        });
    }
}).listen(PORT, () => {
    console.log(`🚀 Proxy running on http://127.0.0.1:${PORT}`);
    console.log(`🔗 Forwarding to: ${GAS_URL}`);
});
