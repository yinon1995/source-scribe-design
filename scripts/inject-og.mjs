import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_INDEX = path.join(ROOT_DIR, 'dist', 'index.html');
const GALLERY_CONFIG_PATH = path.join(ROOT_DIR, 'content', 'home', 'gallery.json');

const DEFAULT_OG = {
    url: "https://a-la-brestoise.vercel.app/",
    title: "A la Brestoise — Articles élégants et fiables",
    description: "Des articles à la Brestoise : Événements, Lieux et Bien-être",
    image: "/favicon.png" // Minimal fallback
};

async function injectOg() {
    console.log("Injecting OG tags...");

    if (!fs.existsSync(DIST_INDEX)) {
        console.error(`Error: ${DIST_INDEX} not found. Run build first.`);
        process.exit(1);
    }

    let ogImage = DEFAULT_OG.image;

    // Try to load gallery config
    if (fs.existsSync(GALLERY_CONFIG_PATH)) {
        try {
            const config = JSON.parse(fs.readFileSync(GALLERY_CONFIG_PATH, 'utf-8'));
            if (config.homeHeroImages && Array.isArray(config.homeHeroImages) && config.homeHeroImages.length > 0) {
                const firstImage = config.homeHeroImages[0];
                if (firstImage.startsWith('http')) {
                    ogImage = firstImage;
                } else if (firstImage.startsWith('/')) {
                    ogImage = DEFAULT_OG.url.replace(/\/$/, '') + firstImage;
                } else {
                    // Relative path without leading slash? Assume relative to root
                    ogImage = DEFAULT_OG.url.replace(/\/$/, '') + '/' + firstImage;
                }
                console.log(`Found hero image: ${ogImage}`);
            }
        } catch (e) {
            console.warn("Failed to read gallery config, using fallback.", e);
        }
    }

    let html = fs.readFileSync(DIST_INDEX, 'utf-8');

    html = html.replace(/__OG_URL__/g, DEFAULT_OG.url);
    html = html.replace(/__OG_TITLE__/g, DEFAULT_OG.title);
    html = html.replace(/__OG_DESC__/g, DEFAULT_OG.description);
    html = html.replace(/__OG_IMAGE__/g, ogImage);

    fs.writeFileSync(DIST_INDEX, html);
    console.log("OG tags injected successfully.");
}

injectOg();
