import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

if (args.length < 2) {
    console.error("Usage: node import-dtrpg.mjs <book-slug> <curl_command_file.txt>");
    process.exit(1);
}

const slug = args[0];
const curlFile = args[1];

if (!fs.existsSync(curlFile)) {
    console.error(`File not found: ${curlFile}`);
    process.exit(1);
}

const curlText = fs.readFileSync(curlFile, 'utf8');

// Parse the curl command
const urlMatch = curlText.match(/curl\s+'([^']+)'/);
if (!urlMatch) {
    console.error("Could not parse URL from curl command. Make sure it's 'Copy as cURL' format.");
    process.exit(1);
}
const url = urlMatch[1];

const headers = {};
const headerRegex = /-H\s+'([^:]+):\s*([^']+)'/g;
let match;
while ((match = headerRegex.exec(curlText)) !== null) {
    let key = match[1];
    let value = match[2];

    // SECURITY FIRST:
    // Strip sensitive cookies (like email, password, auth tokens).
    // We only need Cloudflare tokens to bypass the bot protection.
    if (key.toLowerCase() === 'cookie') {
        const cookies = value.split(';').map(c => c.trim());
        const safeCookies = cookies.filter(c =>
            c.startsWith('cf_clearance') ||
            c.startsWith('__cf') ||
            c.startsWith('siteSettings')
        );
        value = safeCookies.join('; ');
    }
    headers[key] = value;
}

console.log(`Fetching ${url} ...`);
try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    const html = await response.text();

    // Parse metadata safely across newlines
    const titleMatch = html.match(/<meta property="og:title"[\s\S]*?content="([^"]+)"/i);
    const imgMatch = html.match(/<meta property="og:image"[\s\S]*?content="([^"]+)"/i);
    const priceMatch = html.match(/<meta itemprop="price"[\s\S]*?content="\$?([^"]+)"/i);

    if (!titleMatch) {
        throw new Error("Could not find og:title in the HTML.");
    }

    const rawTitle = titleMatch[1];
    // e.g. "Spheres of Power: Expanded Options - Drop Dead Studios | DriveThruRPG.com"
    const titleParts = rawTitle.split(' - ');
    const title = titleParts[0].trim();
    let publisher = "Unknown";
    if (titleParts.length > 1) {
        publisher = titleParts[1].split('|')[0].trim();
    }

    const price = priceMatch ? `$${priceMatch[1]}` : "PLACEHOLDER";
    const imageUrl = imgMatch ? imgMatch[1] : "";

    let coverImageName = "";

    if (imageUrl) {
        console.log(`Downloading cover image from ${imageUrl} ...`);
        let imgExt = path.extname(new URL(imageUrl).pathname) || '.webp';
        // Enforce lowercase
        imgExt = imgExt.toLowerCase();

        coverImageName = `${slug}${imgExt}`;
        const imgRes = await fetch(imageUrl, { headers });
        if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const imgPath = path.join(__dirname, `../src/assets/covers/${coverImageName}`);

        // Ensure directory exists
        const coversDir = path.dirname(imgPath);
        if (!fs.existsSync(coversDir)) {
            fs.mkdirSync(coversDir, { recursive: true });
        }

        fs.writeFileSync(imgPath, buffer);
        console.log(`Saved cover to src/assets/covers/${coverImageName}`);
    }

    const yamlDir = path.join(__dirname, `../src/content/${slug}`);
    if (!fs.existsSync(yamlDir)) {
        fs.mkdirSync(yamlDir, { recursive: true });
    }

    const yamlPath = path.join(yamlDir, '_book.yaml');
    const today = new Date().toISOString().split('T')[0];

    const yamlContent = `title: "${title}"
publisher: "${publisher}"
publishedDate: "${today}"
price: "${price}"
buyUrl: "${url}"
coverImage: "${coverImageName}"
`;
    fs.writeFileSync(yamlPath, yamlContent);
    console.log(`Saved metadata to ${yamlPath}`);
    console.log("Done!");

} catch (e) {
    console.error(e);
    process.exit(1);
}
