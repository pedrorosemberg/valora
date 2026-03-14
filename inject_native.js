const fs = require('fs');

const headerPath = 'public/src/components/header.html';
const footerPath = 'public/src/components/footer.html';

const files = ['public/index.html', 'public/docs.html', 'public/status.html', 'error_page.html'];

function injectComponents() {
    const headerHtml = fs.readFileSync(headerPath, 'utf8');
    const footerHtml = fs.readFileSync(footerPath, 'utf8');

    files.forEach(file => {
        if (!fs.existsSync(file)) return;
        
        let content = fs.readFileSync(file, 'utf8');
        
        // Remove Submenu injected previously
        content = content.replace(/<nav class="metadax-submenu"[\s\S]*?<\/nav>/, '');
        
        // Remove Header
        content = content.replace(/<header class="metadax-header">[\s\S]*?<\/header>/, headerHtml);
        content = content.replace(/<header class="header">[\s\S]*?<\/header>/, headerHtml);
        
        // Remove Footer
        content = content.replace(/<footer class="metadax-footer">[\s\S]*?<\/footer>/, footerHtml);
        content = content.replace(/<footer class="footer">[\s\S]*?<\/footer>/, footerHtml);
        
        // Remove Base CDN that might conflict if not wanted (we're keeping WhatsApp and Loader)
        content = content.replace(/<link rel="stylesheet" href="https:\/\/cdn\.metadax\.com\.br\/components\/css\/styles\.css">/, '');
        
        fs.writeFileSync(file, content);
        console.log(`Injected Native Header/Footer into ${file}`);
    });
}

injectComponents();
