const fs = require('fs');

async function fixPages() {
  const files = ['public/index.html', 'public/docs.html', 'public/status.html', 'error_page.html'];
  const errorPagePath = 'error_page.html';
  const statusPagePath = 'public/status.html';

  // 1. First, we need to unify the <head> block so everything has the GTM, tags, etc.
  // We can grab the pristine <head> from index.html (up to the end of <head>)
  let indexHtml = fs.readFileSync('public/index.html', 'utf8');
  let headMatch = indexHtml.match(/<head>([\s\S]*?)<\/head>/);
  if (!headMatch) {
      console.log('Failed to find head in index.html');
      return;
  }
  let commonHead = headMatch[1];
  
  // 2. Unify the Header + Submenu + Footer
  let headerMatch = indexHtml.match(/<header class="metadax-header">[\s\S]*?<\/header>/);
  let footerMatch = indexHtml.match(/<footer class="metadax-footer">[\s\S]*?<\/footer>/);
  
  const headerContent = headerMatch ? headerMatch[0] : '';
  const footerContent = footerMatch ? footerMatch[0] : '';
  
  const subMenuHtml = `
            <!-- Menu Secundário - Valora -->
            <nav class="metadax-submenu" style="background: rgba(0, 86, 179, 0.05); border-bottom: 1px solid rgba(0,0,0,0.05); padding: 12px 0;">
                <div class="metadax-container" style="display: flex; gap: 24px; font-family: 'DM Mono', monospace; font-size: 0.85rem; max-width: 1200px; margin: 0 auto; padding: 0 20px;">
                    <a href="/" style="color: #0056B3; text-decoration: none; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Início</a>
                    <a href="/docs" style="color: #495057; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em; transition: color 0.3s;" onmouseover="this.style.color='#0056B3'" onmouseout="this.style.color='#495057'">Documentação</a>
                    <a href="/status" style="color: #495057; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em; transition: color 0.3s;" onmouseover="this.style.color='#0056B3'" onmouseout="this.style.color='#495057'">Status do Sistema</a>
                </div>
            </nav>
  `;

  for (let file of files) {
      if (!fs.existsSync(file)) continue;
      
      let content = fs.readFileSync(file, 'utf8');
      
      // Fix Status CSS Variables if it's status.html
      if (file === statusPagePath) {
          content = content.replace(/var\(--primary\)/g, 'var(--gold)');
          content = content.replace(/var\(--bg-card\)/g, 'rgba(255, 255, 255, 0.85)');
          content = content.replace(/var\(--bg\)/g, 'rgba(240, 244, 248, 0.5)');
          content = content.replace(/var\(--text-light\)/g, 'var(--silver-dim)');
          content = content.replace(/var\(--border\)/g, 'rgba(0,0,0,0.05)');
          content = content.replace(/var\(--success\)/g, 'var(--emerald)');
          content = content.replace(/var\(--error\)/g, 'var(--scarlet)');
          content = content.replace(/var\(--warning\)/g, '#f59e0b');
          content = content.replace(/var\(--shadow\)/g, '0 8px 32px rgba(0, 0, 0, 0.04)');
      }
      
      // Fix Error Page Custom CSS if Error Page
      if (file === errorPagePath) {
          // Replace its old head entirely except for its specific title
          content = content.replace(/<head>[\s\S]*?<\/head>/, `<head>\n${commonHead.replace('<title>VALORA by METADAX — Valuation App</title>', '<title>Erro 404 - VALORA by METADAX</title>')}\n</head>`);
          // Replace its inline styles
          content = content.replace(/--primary: #1a1a2e;/, '--primary: #ffffff;');
          content = content.replace(/--secondary: #16213e;/, '--secondary: #f8f9fa;');
          content = content.replace(/--accent: #e94560;/, '--accent: #0056B3;');
          content = content.replace(/--text: #ffffff;/, '--text: #1E1E1E;');
          content = content.replace(/--text-secondary: #a0a0a0;/, '--text-secondary: #6c757d;');
          // Remove its own header/footer and replace with Metadax ones
          content = content.replace(/<div class="logo">.*?<\/div>/, ''); // Remove its own logo
          content = content.replace(/<div class="footer">[\s\S]*?<\/div>/, footerContent);
      }
      
      // Check replacing header / footer
      if (file === statusPagePath || file === errorPagePath) {
          if (!content.includes('<header class="metadax-header">')) {
              if (content.match(/<header class="header">[\s\S]*?<\/header>/)) {
                  content = content.replace(/<header class="header">[\s\S]*?<\/header>/, headerContent);
              } else {
                  content = content.replace(/<body>/, `<body>\n${headerContent}`);
              }
          }
          if (!content.includes('<footer class="metadax-footer">')) {
              if (content.match(/<footer class="footer">[\s\S]*?<\/footer>/)) {
                  content = content.replace(/<footer class="footer">[\s\S]*?<\/footer>/, footerContent);
              } else {
                  content = content.replace(/<\/body>/, `${footerContent}\n</body>`);
              }
          }
      }
      
      // Inject Submenu after header if not already there
      if (!content.includes('Menu Secundário - Valora')) {
          content = content.replace(/<\/header>/, `</header>\n${subMenuHtml}`);
      }
      
      // Ensure scripts like MetadaxLoader and WhatsApp are in all files
      if (!content.includes('metadax-loader.js')) {
          const scriptsHtml = `
    <!-- Scripts CDN -->
    <script src="https://cdn.metadax.com.br/components/scripts/whatsapp-button.js"></script>
    <script src="https://cdn.metadax.com.br/metadax-loader.js"></script>
    <script src="https://cdn.metadax.com.br/component-loader.js"></script>
    <script>
        // Inicializa o loader com a logo padrão
        MetadaxLoader.init({
            logoUrl: 'https://cdn.metadax.com.br/assets/images/loader.png',
            duration: 1000
        });
    </script>
          `;
          content = content.replace(/<\/body>/, `${scriptsHtml}\n</body>`);
      }
      // Also apply the head update to status
      if (file === statusPagePath) {
          content = content.replace(/<head>[\s\S]*?<\/head>/, `<head>\n${commonHead.replace('<title>VALORA by METADAX — Valuation App</title>', '<title>Status do Sistema - VALORA</title>')}\n</head>`);
      }

      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
  }
}

fixPages();
