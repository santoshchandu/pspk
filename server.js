const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = 3000;
const ASCII_FILE_PATH = path.join(__dirname, 'pspk.txt');

// Function to scale ASCII art
function scaleAscii(art, widthScale = 1, heightScale = 1) {
  const lines = art.split('\n');
  
  // Scale height by repeating/skipping lines
  let scaledLines = [];
  if (heightScale >= 1) {
    // Enlarge: repeat lines
    for (const line of lines) {
      for (let i = 0; i < heightScale; i++) {
        scaledLines.push(line);
      }
    }
  } else {
    // Shrink: skip lines
    const step = Math.round(1 / heightScale);
    for (let i = 0; i < lines.length; i += step) {
      scaledLines.push(lines[i]);
    }
  }
  
  // Scale width by repeating/skipping characters
  if (widthScale !== 1) {
    scaledLines = scaledLines.map(line => {
      if (widthScale >= 1) {
        // Enlarge: repeat characters
        return line.split('').map(char => char.repeat(widthScale)).join('');
      } else {
        // Shrink: skip characters
        const step = Math.round(1 / widthScale);
        return line.split('').filter((_, i) => i % step === 0).join('');
      }
    });
  }
  
  return scaledLines.join('\n');
}

// --- Start of Fixes ---

// 1. Read and process the ASCII art file only ONCE at startup.
let scaledArt;
try {
  const originalArt = fs.readFileSync(ASCII_FILE_PATH, 'utf8');
  scaledArt = scaleAscii(originalArt, 1, 1);
} catch (error) {
  console.error(`FATAL: Could not read or process ASCII art file at ${ASCII_FILE_PATH}.`, error);
  // If the art is essential, exit. Otherwise, provide fallback content.
  scaledArt = 'Error: ASCII art file not found.';
  // process.exit(1); // Uncomment to make the app exit if the file is missing.
}


// 2. Consolidate all request logic into a single handler.
app.use((req, res) => {
  const userAgent = req.headers['user-agent'] || '';
  const isCurl = userAgent.toLowerCase().includes('curl');
  
  if (isCurl) {
    // Always serve plain text art to curl, regardless of the path.
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(scaledArt);
  } else {
    // For browsers:
    if (req.path === '/') {
      // If at the root path, serve the HTML page.
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>ASCII Art Display</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              max-width: 800px; 
              margin: 40px auto; 
              padding: 20px;
              background-color: #121212;
              color: #e0e0e0;
              line-height: 1.6;
            }
            pre { 
              background-color: #000; 
              color: #0f0; /* Classic green terminal color */
              padding: 1.5em; 
              border-radius: 8px;
              overflow-x: auto;
              font-size: 2px; /* Small font size to render art correctly */
              line-height: 1; /* Tight line height for art */
              white-space: pre;
            }
            .command {
              background-color: #282c34;
              padding: 12px 15px;
              border-radius: 5px;
              font-family: "Courier New", monospace;
              margin: 20px 0;
              color: #abb2bf;
            }
            h1, h2 {
              color: #61afef;
              border-bottom: 1px solid #333;
              padding-bottom: 5px;
            }
            a {
              color: #98c379;
            }
          </style>
        </head>
        <body>
          <h1>ASCII Art Server</h1>
          <p>This server displays ASCII art. For the best experience, view it in your terminal using curl:</p>
          <div class="command">curl ${req.protocol}://${req.get('host')}</div>
          
          <h2>Browser Preview:</h2>
          <pre>${scaledArt}</pre>
        </body>
        </html>
      `);
    } else {
      // If at any other path, redirect to the root.
      res.redirect('/');
    }
  }
});

// --- End of Fixes ---

app.listen(PORT, () => {
  console.log(`✅ ASCII Art server running on http://localhost:${PORT}`);
  console.log(`💻 In your terminal, try: curl http://localhost:${PORT}`);
});