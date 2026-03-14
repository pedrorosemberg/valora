const fs = require('fs');
const path = require('path');

const files = [
    'public/index.html',
    'public/docs.html',
    'public/status.html',
    'error_page.html'
];

function cleanHTML() {
    files.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) return;
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Remove componentloader
        content = content.replace(/<script src="https:\/\/cdn\.metadax\.com\.br\/component-loader\.js"><\/script>\n?/g, '');
        
        // Remove carousel
        content = content.replace(/<span id="startups-carrousel-metadax-js"><\/span>\n?/g, '');
        content = content.replace(/<script src="https:\/\/cdn\.metadax\.com\.br\/startups-carousel-metadax\.js"><\/script>\n?/g, '');
        
        // Remove potential legacy header/footer fetching configs if they exist in JS
        
        fs.writeFileSync(filePath, content);
        console.log(`Cleaned remnants from ${file}`);
    });
}

cleanHTML();
