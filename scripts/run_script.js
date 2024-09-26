const fs = require('fs-extra');
const path = require('path');
const { JSDOM } = require('jsdom');
const { applyTranslation, supportedLanguages } = require('./translate.js');

(async () => {
    try {
        const baseDir = path.resolve(__dirname, '..');
        const englishHtmlPath = path.join(baseDir, 'original', 'index.html');

        if (!(await fs.pathExists(englishHtmlPath))) {
            throw new Error(`English HTML file not found: ${englishHtmlPath}`);
        }

        const html = await fs.readFile(englishHtmlPath, 'utf8');

        const baseUrl = "https://decsp.github.io/injector-test";
        const usePathParam = true;

        for (const lang of supportedLanguages) {
            console.log(`Processing ${lang.text} (${lang.value})...`);

            const dom = new JSDOM(html);
            await applyTranslation(dom.window.document, lang.value, {
                baseUrl,
                usePathParam,
                currentPath: `${lang.value}/`
            });

            const modifiedHtml = dom.serialize();

            const outputPath = path.join(baseDir, lang.value, 'index.html');
            await fs.outputFile(outputPath, modifiedHtml, 'utf8');
            console.log(`Translated HTML saved to ${outputPath}`);

            const srcAssetsPath = path.join(baseDir, 'original', 'assets');
            const destAssetsPath = path.join(baseDir, lang.value, 'assets');

            if (await fs.pathExists(srcAssetsPath)) {
                await fs.copy(srcAssetsPath, destAssetsPath);
                console.log(`Assets copied to ${destAssetsPath}`);
            } else {
                console.warn(`Assets folder not found: ${srcAssetsPath}`);
            }
        }

        console.log('All processing completed successfully.');
    } catch (error) {
        console.error('Error during processing:', error);
    }
})();