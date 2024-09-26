const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { applyTranslation } = require('./translate.js');

// Read the HTML file
const html = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');

// Create a JSDOM instance
const dom = new JSDOM(html);

// Run the translation
(async () => {
    try {
        await applyTranslation(dom.window.document, 'fr');
        
        // Get the modified HTML
        const modifiedHtml = dom.serialize();

        // Save the modified HTML to a new file
        const outputPath = path.resolve(__dirname, 'index_translated.html');
        fs.writeFileSync(outputPath, modifiedHtml, 'utf8');

        console.log('Translated HTML has been saved to index_translated.html');
    } catch (error) {
        console.error('Error during translation:', error);
    }
})();