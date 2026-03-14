const fs = require('fs');

const headerPath = 'public/src/components/header.html';
const footerPath = 'public/src/components/footer.html';

const files = ['public/index.html', 'public/docs.html', 'public/status.html', 'error_page.html'];

function reinjectComponents() {
    const headerHtml = fs.readFileSync(headerPath, 'utf8');
    const footerHtml = fs.readFileSync(footerPath, 'utf8');

    files.forEach(file => {
        if (!fs.existsSync(file)) return;
        
        let content = fs.readFileSync(file, 'utf8');
        
        // Remove and replace Native Header
        content = content.replace(/<header class="valora-header-native">[\s\S]*?<\/header>\n*<style>[\s\S]*?<\/style>/, headerHtml);
        
        // Replace Native Footer
        content = content.replace(/<footer class="valora-footer-native">[\s\S]*?<\/footer>\n*<style>[\s\S]*?<\/style>/, footerHtml);
        
        fs.writeFileSync(file, content);
        console.log(`Re-injected component into ${file}`);
    });
}

reinjectComponents();
