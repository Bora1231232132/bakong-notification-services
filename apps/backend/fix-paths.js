#!/usr/bin/env node
/**
 * Post-build script to fix unresolved src/ paths in compiled JavaScript
 * This replaces all require('src/...') with relative paths
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');

function fixPathsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let modified = false;

  // Replace require('src/...') and require("src/...") with relative paths
  // Match both single and double quotes, and handle various patterns
  const srcPathRegex = /require\((['"])(src\/[^'"]+)\1\)/g;
  
  content = content.replace(srcPathRegex, (match, quote, srcPath) => {
    // Convert src/... to dist/... (since dist mirrors src structure)
    const distPath = srcPath.replace(/^src\//, 'dist/');
    
    // Calculate relative path from current file to the target
    const currentDir = path.dirname(filePath);
    const targetPath = path.join(__dirname, distPath);
    
    // Add .js extension if not present and file exists
    let targetWithExt = targetPath;
    if (!targetPath.endsWith('.js')) {
      targetWithExt = targetPath + '.js';
      // Check if file exists, if not try without extension
      if (!fs.existsSync(targetWithExt) && fs.existsSync(targetPath)) {
        targetWithExt = targetPath;
      }
    }
    
    const relativePath = path.relative(currentDir, targetWithExt);
    
    // Normalize path separators and ensure it starts with ./
    let relative = relativePath.replace(/\\/g, '/');
    if (!relative.startsWith('.')) {
      relative = './' + relative;
    }
    
    // Remove .js extension for require (Node.js adds it automatically)
    relative = relative.replace(/\.js$/, '');
    
    modified = true;
    return `require(${quote}${relative}${quote})`;
  });

  if (modified && content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed paths in: ${path.relative(distDir, filePath)}`);
    return true;
  }
  return false;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.js')) {
      fixPathsInFile(filePath);
    }
  }
}

console.log('Fixing src/ paths in dist/...');
let totalFixed = 0;
function walkDirWithCount(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDirWithCount(filePath);
    } else if (file.endsWith('.js')) {
      if (fixPathsInFile(filePath)) {
        totalFixed++;
      }
    }
  }
}

walkDirWithCount(distDir);
console.log(`Done! Fixed ${totalFixed} file(s).`);

// Verify no src/ paths remain
const remaining = [];
function checkRemaining(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      checkRemaining(filePath);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (/require\(['"]src\//.test(content)) {
        remaining.push(path.relative(distDir, filePath));
      }
    }
  }
}

checkRemaining(distDir);
if (remaining.length > 0) {
  console.error(`\n❌ ERROR: ${remaining.length} file(s) still contain src/ paths:`);
  remaining.slice(0, 10).forEach(f => console.error(`  - ${f}`));
  process.exit(1);
} else {
  console.log('✅ Verification: No src/ paths remaining!');
}

