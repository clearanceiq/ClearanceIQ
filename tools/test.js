const http = require('http');
const fs = require('fs');
const path = require('path');

const base = 'C:/Users/Najmi/Documents/Tycoon/site/tools';
const files = fs.readdirSync(base).filter(f => f.endsWith('.html'));

const results = {};

for (const file of files) {
  const filePath = path.join(base, file);
  const html = fs.readFileSync(filePath, 'utf8');

  results[file] = {
    hasTitle: /<title>.*<\/title>/.test(html),
    hasMetaDesc: /<meta name="description"/.test(html),
    hasCanonical: /<link rel="canonical"/.test(html),
    hasJsonLd: /application\/ld\+json/.test(html),
    hasForm: /<form|onsubmit|onclick/.test(html),
    extractedInputs: (html.match(/<input|<select|<textarea/g) || []).length,
    title: html.match(/<title>([^<]+)<\/title>/)?.[1] || 'MISSING'
  };
}

console.log(JSON.stringify(results, null, 2));
