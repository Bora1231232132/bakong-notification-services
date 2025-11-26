const fs = require('fs');
const path = require('path');

// Files and directories to ignore
const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.cache',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
  '*.log',
  '.env',
  '.env.*',
  '*.swp',
  '*.swo',
  '*~',
];

// File type comments mapping
const FILE_COMMENTS = {
  '*.dto.ts': ' # Data Transfer Object',
  '*.entity.ts': ' # Database entity',
  '*.service.ts': ' # Service',
  '*.controller.ts': ' # Controller',
  '*.spec.ts': ' # Test file',
  '*.guard.ts': ' # Guard',
  '*.strategy.ts': ' # Strategy',
  '*.module.ts': ' # Module',
  '*.vue': ' # Component',
  '*.ts': ' # TypeScript file',
  '*.js': ' # JavaScript file',
  '*.json': ' # Configuration',
  '*.md': ' # Documentation',
  '*.sql': ' # SQL script',
  '*.sh': ' # Shell script',
  '*.yml': ' # Configuration',
  '*.yaml': ' # Configuration',
  '*.hcl': ' # Configuration',
  'Dockerfile': ' # Docker image definition',
  'nginx.conf': ' # Nginx configuration',
  'main.ts': ' # Application entry point',
  'App.vue': ' # Root Vue component',
  'app.module.ts': ' # Root NestJS module',
  'ormconfig.ts': ' # TypeORM configuration',
  'index.html': ' # HTML entry point',
  'vite.config.ts': ' # Vite build configuration',
  'nest-cli.json': ' # NestJS CLI configuration',
  'tsconfig.json': ' # TypeScript configuration',
  'package.json': ' # Dependencies and scripts',
  'docker-compose.yml': ' # Docker Compose configuration',
  'README.md': ' # Documentation',
};

// Special file type comments
const SPECIAL_COMMENTS = {
  'use*.ts': ' # Composable',
  '*Api.ts': ' # API service',
  '*View.vue': ' # Page view',
};

function shouldIgnore(filePath, basePath) {
  const relativePath = path.relative(basePath, filePath);
  const parts = relativePath.split(path.sep);
  const fileName = path.basename(filePath);
  
  return IGNORE_PATTERNS.some(pattern => {
    // Exact match for directory or file names
    if (parts.includes(pattern) || fileName === pattern) {
      return true;
    }
    
    // Wildcard pattern matching
    if (pattern.includes('*')) {
      // Convert wildcard pattern to regex (escape special chars except *)
      const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      const regex = new RegExp('^' + escapedPattern + '$');
      // Check full path and individual parts
      return regex.test(relativePath) || parts.some(part => regex.test(part)) || regex.test(fileName);
    }
    
    // Simple substring match for paths (but not for wildcard patterns)
    return relativePath.includes(pattern);
  });
}

function getFileComment(fileName) {
  // Check special patterns first
  for (const [pattern, comment] of Object.entries(SPECIAL_COMMENTS)) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    if (regex.test(fileName)) {
      return comment;
    }
  }
  
  // Check exact matches
  if (FILE_COMMENTS[fileName]) {
    return FILE_COMMENTS[fileName];
  }
  
  // Check extension patterns
  for (const [pattern, comment] of Object.entries(FILE_COMMENTS)) {
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1);
      if (fileName.endsWith(ext)) {
        return comment;
      }
    }
  }
  
  return '';
}

function buildTree(dir, basePath, prefix = '', isLast = true, maxDepth = 10, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return '';
  }
  
  if (shouldIgnore(dir, basePath)) {
    return '';
  }
  
  const lines = [];
  
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true })
      .filter(item => !shouldIgnore(path.join(dir, item.name), basePath))
      .sort((a, b) => {
        // Directories first, then files
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });
    
    if (items.length === 0) {
      return '';
    }
    
    items.forEach((item, index) => {
      const isLastItem = index === items.length - 1;
      const itemPath = path.join(dir, item.name);
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      
      if (item.isDirectory()) {
        lines.push(`${prefix}${isLastItem ? '└── ' : '├── '}${item.name}/`);
        const subtree = buildTree(itemPath, basePath, newPrefix, isLastItem, maxDepth, currentDepth + 1);
        if (subtree) {
          lines.push(subtree);
        }
      } else {
        const comment = getFileComment(item.name);
        lines.push(`${prefix}${isLastItem ? '└── ' : '├── '}${item.name}${comment}`);
      }
    });
  } catch (error) {
    // Ignore permission errors
  }
  
  return lines.join('\n');
}

function scanDirectory(dirPath, basePath) {
  const dirName = path.basename(dirPath);
  const tree = buildTree(dirPath, basePath);
  return tree ? `${dirName}/\n${tree}` : `${dirName}/\n`;
}

function updateProjectStructure() {
  const projectRoot = path.resolve(__dirname, '../..');
  const outputFile = path.join(projectRoot, '.cursor/rules/project-structure.mdc');
  
  // Read existing file to preserve frontmatter and custom sections
  let existingContent = '';
  try {
    existingContent = fs.readFileSync(outputFile, 'utf8');
  } catch (error) {
    console.error('Error reading existing file:', error.message);
    return;
  }
  
  // Extract frontmatter
  const frontmatterMatch = existingContent.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter = frontmatterMatch ? frontmatterMatch[0] : '';
  
  // Extract custom sections (everything after Docker Configuration)
  const customSectionsMatch = existingContent.match(/## Docker Configuration[\s\S]*$/);
  const customSections = customSectionsMatch ? customSectionsMatch[0] : '';
  
  // Build new structure
  const sections = [];
  
  // Root directory structure
  const rootFiles = fs.readdirSync(projectRoot)
    .filter(item => {
      const itemPath = path.join(projectRoot, item);
      const stat = fs.statSync(itemPath);
      return !shouldIgnore(itemPath, projectRoot) && stat.isFile();
    })
    .sort();
  
  const rootDirs = fs.readdirSync(projectRoot)
    .filter(item => {
      const itemPath = path.join(projectRoot, item);
      const stat = fs.statSync(itemPath);
      return !shouldIgnore(itemPath, projectRoot) && stat.isDirectory() && item !== '.cursor';
    })
    .sort();
  
  let rootStructure = 'bakong-notification-services/\n';
  rootDirs.forEach((dir, index) => {
    const isLast = index === rootDirs.length - 1 && rootFiles.length === 0;
    rootStructure += `├── ${dir}/\n`;
  });
  
  rootFiles.forEach((file, index) => {
    const isLast = index === rootFiles.length - 1;
    const comment = getFileComment(file);
    rootStructure += `${isLast ? '└── ' : '├── '}${file}${comment}\n`;
  });
  
  sections.push(`## Root Directory Structure\n\n\`\`\`\n${rootStructure.trim()}\n\`\`\``);
  
  // Backend structure
  const backendSrcPath = path.join(projectRoot, 'apps/backend/src');
  if (fs.existsSync(backendSrcPath)) {
    sections.push(`## Backend Structure (\`apps/backend/\`)\n\n### Source Code (\`apps/backend/src/\`)\n\n\`\`\`\n${scanDirectory(backendSrcPath, projectRoot).trim()}\n\`\`\``);
  }
  
  // Backend configuration files
  const backendPath = path.join(projectRoot, 'apps/backend');
  if (fs.existsSync(backendPath)) {
    const backendConfig = scanDirectory(backendPath, projectRoot);
    sections.push(`### Backend Configuration Files\n\n\`\`\`\n${backendConfig.trim()}\n\`\`\``);
  }
  
  // Frontend structure
  const frontendSrcPath = path.join(projectRoot, 'apps/frontend/src');
  if (fs.existsSync(frontendSrcPath)) {
    sections.push(`## Frontend Structure (\`apps/frontend/\`)\n\n### Source Code (\`apps/frontend/src/\`)\n\n\`\`\`\n${scanDirectory(frontendSrcPath, projectRoot).trim()}\n\`\`\``);
  }
  
  // Frontend configuration files
  const frontendPath = path.join(projectRoot, 'apps/frontend');
  if (fs.existsSync(frontendPath)) {
    const frontendConfig = scanDirectory(frontendPath, projectRoot);
    sections.push(`### Frontend Configuration Files\n\n\`\`\`\n${frontendConfig.trim()}\n\`\`\``);
  }
  
  // Shared package structure
  const sharedPath = path.join(projectRoot, 'apps/packages/shared');
  if (fs.existsSync(sharedPath)) {
    sections.push(`## Shared Package Structure (\`apps/packages/shared/\`)\n\n\`\`\`\n${scanDirectory(sharedPath, projectRoot).trim()}\n\`\`\``);
  }
  
  // Combine everything
  const newContent = `${frontmatter}\n# Project Structure Reference\n\nThis document outlines the complete directory structure and important files in the Bakong Notification Service project.\n\n**⚠️ Auto-generated**: This file is automatically updated. Run \`npm run update:project-structure\` to regenerate.\n\n${sections.join('\n\n')}\n\n## Important Files Reference\n\n### Configuration Files\n\n| File | Location | Purpose |\n|---|----|---|\n| \`package.json\` | Root | Workspace configuration, root scripts |\n| \`tsconfig.json\` | Root | Root TypeScript configuration |\n| \`docker-compose.yml\` | Root | Local development Docker setup |\n| \`docker-compose.sit.yml\` | Root | SIT/Staging Docker setup |\n| \`docker-compose.production.yml\` | Root | Production Docker setup |\n| \`docker-bake.hcl\` | Root | Docker build configuration |\n\n### Entry Points\n\n| File | Location | Purpose |\n|---|----|---|\n| \`main.ts\` | \`apps/backend/src/\` | Backend application entry point |\n| \`main.ts\` | \`apps/frontend/src/\` | Frontend application entry point |\n| \`App.vue\` | \`apps/frontend/src/\` | Root Vue component |\n| \`app.module.ts\` | \`apps/backend/src/modules/\` | Root NestJS module |\n\n### Database Files\n\n| File | Location | Purpose |\n|---|----|---|\n| \`ormconfig.ts\` | \`apps/backend/src/\` | TypeORM configuration |\n| \`init-db.sql\` | \`apps/backend/\` | Database initialization |\n| \`init-db-data-development.sql\` | \`apps/backend/\` | Development seed data |\n\n### Deployment Scripts\n\n| File | Location | Purpose |\n|---|----|---|\n| \`deploy-on-server.sh\` | Root | General server deployment |\n| \`deploy-to-production.sh\` | Root | Production deployment |\n| \`backup-db-data.js\` | \`apps/backend/\` | Database backup utility |\n| \`update-project-structure.js\` | \`.cursor/scripts/\` | Auto-update project structure documentation |\n\n${customSections}`;
  
  // Write updated content
  try {
    fs.writeFileSync(outputFile, newContent, 'utf8');
    console.log('✅ Project structure documentation updated successfully!');
    console.log(`📄 Updated: ${outputFile}`);
  } catch (error) {
    console.error('❌ Error writing file:', error.message);
    process.exit(1);
  }
}

// Run the update
updateProjectStructure();

