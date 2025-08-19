#!/usr/bin/env node

/**
 * Script to generate hashed admin password for environment variables
 * Usage: node scripts/generate-admin-hash.js [password] [algorithm]
 * 
 * Algorithms supported: SHA-256, SHA-384, SHA-512, MD5
 * Default algorithm: SHA-256
 */

import crypto from 'crypto';

// Hash password function (same as in security.ts but for Node.js)
const hashPassword = async (password, algorithm = 'SHA-256') => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  let hashAlgorithm;
  switch (algorithm) {
    case 'SHA-256':
      hashAlgorithm = 'sha256';
      break;
    case 'SHA-384':
      hashAlgorithm = 'sha384';
      break;
    case 'SHA-512':
      hashAlgorithm = 'sha512';
      break;
    case 'MD5':
      hashAlgorithm = 'md5';
      break;
    default:
      hashAlgorithm = 'sha256';
  }
  
  const hash = crypto.createHash(hashAlgorithm);
  hash.update(data);
  return hash.digest('hex');
};

const main = async () => {
  const args = process.argv.slice(2);
  const password = args[0] || 'admin123';
  const algorithm = args[1] || 'SHA-256';
  
  console.log('Generating hashed password...');
  console.log(`Password: ${password}`);
  console.log(`Algorithm: ${algorithm}`);
  console.log('');
  
  try {
    const hashedPassword = await hashPassword(password, algorithm);
    
    console.log('Generated hash:');
    console.log(hashedPassword);
    console.log('');
    console.log('Add this to your .env file:');
    console.log(`VITE_ADMIN_PASSWORD_HASH=${hashedPassword}`);
    console.log('');
    console.log('You can now remove the plain text VITE_ADMIN_PASSWORD from your .env file.');
    
  } catch (error) {
    console.error('Error generating hash:', error);
    process.exit(1);
  }
};

main();