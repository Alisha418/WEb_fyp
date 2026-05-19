#!/usr/bin/env node

/**
 * Auto-start script for AI Waste Detection System
 * Starts both backend (Python) and frontend (React) simultaneously
 * 
 * Usage: node start-system.js
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const projectDir = __dirname;
const isWindows = os.platform() === 'win32';

console.log('\n');
console.log('================================================'.cyan);
console.log('    AI Waste Detection - Starting System'.cyan);
console.log('================================================'.cyan);
console.log('\n');

// Start backend
console.log('[1/2] Starting backend server...'.green);
const backend = spawn(isWindows ? 'python' : 'python3', ['backend.py'], {
    cwd: projectDir,
    stdio: 'inherit',
    shell: isWindows
});

// Start frontend after a delay
setTimeout(() => {
    console.log('[2/2] Starting frontend...'.green);
    const frontend = spawn('npm', ['run', 'dev:frontend'], {
        cwd: projectDir,
        stdio: 'inherit',
        shell: isWindows
    });

    // Handle process termination
    frontend.on('error', (err) => {
        console.error('Frontend error:', err);
    });
}, 3000);

// Handle backend termination
backend.on('error', (err) => {
    console.error('Backend error:', err);
});

console.log('\n');
console.log('================================================'.green);
console.log('    ✅ System Started'.green);
console.log('================================================'.green);
console.log('\n');
console.log('Backend:  http://localhost:5000'.yellow);
console.log('Frontend: http://localhost:5173'.yellow);
console.log('\nPress Ctrl+C to stop all services\n');