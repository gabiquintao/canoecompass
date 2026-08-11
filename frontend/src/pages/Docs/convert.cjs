const fs = require('fs');
const path = require('path');

const htmlPath = 'C:\\\\Users\\\\gabri\\\\Documents\\\\projects\\\\canoecompass\\\\docs\\\\index.html';
const outPath = path.join(__dirname, 'DocsContent.tsx');
const sidebarPath = path.join(__dirname, 'DocsSidebar.tsx');
const tocPath = path.join(__dirname, 'DocsTOC.tsx');

let html = fs.readFileSync(htmlPath, 'utf-8');

// Extract main content
const mainMatch = html.match(/<article>([\s\S]*?)<\/article>/);
if (!mainMatch) {
    console.error("Could not find <article>");
    process.exit(1);
}

let content = mainMatch[1];
// Escape backticks and dollars so we can put it in a template literal
content = content.replace(/`/g, '\\`').replace(/\$/g, '\\$');

const contentTsx = `
import styles from "./DocsApp.module.css";

const docsHtml = \`${content}\`;

export function DocsContent() {
    return (
        <article
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: docsHtml }}
        />
    );
}
`;
fs.writeFileSync(outPath, contentTsx);

// Extract Sidebar
const navMatch = html.match(/<nav id="sidebar">([\s\S]*?)<\/nav>/);
let navContent = navMatch ? navMatch[1] : '';
navContent = navContent.replace(/`/g, '\\`').replace(/\$/g, '\\$');
// Convert href="# to href="/docs# inside the raw HTML
navContent = navContent.replace(/href="#/g, 'href="/docs#');
// Add active states or whatever if needed, but for now just raw HTML is fine
const sidebarTsx = `
import styles from "./DocsApp.module.css";

const sidebarHtml = \`${navContent}\`;

export function DocsSidebar() {
    return (
        <nav
            className={styles.sidebarNav}
            dangerouslySetInnerHTML={{ __html: sidebarHtml }}
        />
    );
}
`;
fs.writeFileSync(sidebarPath, sidebarTsx);

// TOC
const tocTsx = `
import styles from "./DocsApp.module.css";

export function DocsTOC() {
    return (
        <div className={styles.tocContainer}>
            <div className={styles.tocTitle}>On this page</div>
            <a href="/docs#architecture" className={styles.navLink}>Architecture</a>
            <a href="/docs#tech-stack" className={styles.navLink}>Tech Stack</a>
            <a href="/docs#data-lifecycle" className={styles.navLink}>Data Lifecycle</a>
            <a href="/docs#scoring-decision-tree" className={styles.navLink}>Scoring Tree</a>
            <a href="/docs#deployment" className={styles.navLink}>Deployment</a>
        </div>
    );
}
`;
fs.writeFileSync(tocPath, tocTsx);

console.log("Successfully generated components using dangerouslySetInnerHTML.");
