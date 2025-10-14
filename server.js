const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// Use Vercel's PORT or default to 3000 for local development
const PORT = process.env.PORT || 3000;
const ASCII_FILE_PATH = path.join(__dirname, 'pspk.txt');

// Function to scale ASCII art
function scaleAscii(art, widthScale = 1, heightScale = 1) {
  const lines = art.split('\n');
  
  // Scale height by repeating/skipping lines
  let scaledLines = [];
  if (heightScale >= 1) {
    for (const line of lines) {
      for (let i = 0; i < heightScale; i++) {
        scaledLines.push(line);
      }
    }
  } else {
    const step = Math.round(1 / heightScale);
    for (let i = 0; i < lines.length; i += step) {
      scaledLines.push(lines[i]);
    }
  }
  
  // Scale width by repeating/skipping characters
  if (widthScale !== 1) {
    scaledLines = scaledLines.map(line => {
      if (widthScale >= 1) {
        return line.split('').map(char => char.repeat(widthScale)).join('');
      } else {
        const step = Math.round(1 / widthScale);
        return line.split('').filter((_, i) => i % step === 0).join('');
      }
    });
  }
  
  return scaledLines.join('\n');
}

// Read and cache the ASCII art at startup
let scaledArt;
try {
  const originalArt = fs.readFileSync(ASCII_FILE_PATH, 'utf8');
  scaledArt = scaleAscii(originalArt, 1, 1);
  console.log('✅ ASCII art loaded successfully');
} catch (error) {
  console.error(`❌ Could not read ASCII art file at ${ASCII_FILE_PATH}`, error.message);
  scaledArt = 'Error: ASCII art file not found.\n\nPlease ensure pspk.txt exists in the project root.';
}

// Unified request handler
app.use((req, res) => {
  // Health check endpoint
  if (req.path === '/health') {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }
  
  const userAgent = req.headers['user-agent'] || '';
  const isCurl = /curl|wget|httpie/i.test(userAgent);
  
  // Serve plain text ASCII art for CLI tools
  if (isCurl) {
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    return res.send(scaledArt);
  }
  
  // For browsers: redirect non-root paths to root
  if (req.path !== '/') {
    return res.redirect(301, '/');
  }
  
  // Serve HTML page at root
  res.set('Cache-Control', 'public, max-age=3600');
  const curlCommand = `curl https://${req.get('host')}`;
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PSPK ASCII Art</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #0a0a0a;
          color: #e0e0e0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .container {
          text-align: center;
        }
        
        .command-wrapper {
          display: inline-flex;
          align-items: center;
          background: #1a1a1a;
          border: 2px solid #333;
          border-radius: 12px;
          padding: 20px 25px;
          gap: 15px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        
        .command {
          font-family: "SF Mono", "Courier New", monospace;
          color: #58a6ff;
          font-size: 1.2em;
          user-select: all;
        }
        
        .copy-btn {
          background: #238636;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9em;
          font-weight: 500;
          transition: all 0.2s;
          white-space: nowrap;
        }
        
        .copy-btn:hover {
          background: #2ea043;
          transform: translateY(-1px);
        }
        
        .copy-btn:active {
          transform: translateY(0);
        }
        
        .copy-btn.copied {
          background: #1f6feb;
        }
        
        @media (max-width: 600px) {
          .command-wrapper {
            flex-direction: column;
            gap: 12px;
          }
          
          .command {
            font-size: 1em;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="command-wrapper">
          <code class="command" id="curlCommand">${curlCommand}</code>
          <button class="copy-btn" id="copyBtn" onclick="copyCommand()">Copy</button>
        </div>
      </div>
      
      <script>
        function copyCommand() {
          const command = document.getElementById('curlCommand').textContent;
          const btn = document.getElementById('copyBtn');
          
          navigator.clipboard.writeText(command).then(() => {
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            
            setTimeout(() => {
              btn.textContent = 'Copy';
              btn.classList.remove('copied');
            }, 2000);
          }).catch(() => {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = command;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            
            setTimeout(() => {
              btn.textContent = 'Copy';
              btn.classList.remove('copied');
            }, 2000);
          });
        }
      </script>
    </body>
    </html>
  `);
});

// Health check endpoint (useful for monitoring)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ ASCII Art server running on http://localhost:${PORT}`);
  console.log(`💻 Try: curl http://localhost:${PORT}`);
});
