#!/usr/bin/env node
/**
 * Runtime path resolver - intercepts require() calls and resolves src/ paths
 * This is a workaround for path resolution issues in compiled code
 */

const Module = require('module');
const path = require('path');
const fs = require('fs');

// Store original _resolveFilename
const originalResolveFilename = Module._resolveFilename;

// Override _resolveFilename to handle src/ paths at module resolution time
Module._resolveFilename = function(request, parent, isMain, options) {
  // If the module ID starts with 'src/', resolve it to the correct dist/ path
  if (request.startsWith('src/')) {
    // Convert src/... to dist/... (since dist mirrors src structure)
    const distPath = request.replace(/^src\//, 'dist/');
    
    // Resolve from the working directory (where the app runs from)
    const workingDir = process.cwd();
    const resolvedPath = path.resolve(workingDir, distPath);
    
    // Try with .js extension first
    let finalPath = resolvedPath + '.js';
    if (fs.existsSync(finalPath)) {
      return finalPath;
    }
    
    // Try without extension
    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
    
    // Try as a directory with index.js
    const indexPath = path.resolve(resolvedPath, 'index.js');
    if (fs.existsSync(indexPath)) {
      return indexPath;
    }
    
    // Log warning if file not found (for debugging)
    console.warn(`⚠️  Runtime resolver: Could not resolve '${request}' to '${resolvedPath}'`);
  }
  
  // For all other requires, use original behavior
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

