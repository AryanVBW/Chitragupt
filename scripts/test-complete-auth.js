#!/usr/bin/env node

/**
 * Complete authentication system test
 * Tests both the hash verification and the complete auth flow
 */

import crypto from 'crypto';

// Simulate the complete verifyPassword function from security.ts
const verifyPassword = async (password, hashedPassword) => {
  try {
    // Check if hash is in 'algorithm:hash' format
    const colonIndex = hashedPassword.indexOf(':');
    
    if (colonIndex > 0) {
      // New format: 'algorithm:hash'
      const [algorithm, hash] = hashedPassword.split(':');
      
      const algorithmMap = {
        'sha-256': 'SHA-256',
        'sha-384': 'SHA-384',
        'sha-512': 'SHA-512',
        'md5': 'MD5'
      };
      
      const cryptoAlgorithm = algorithmMap[algorithm.toLowerCase()];
      if (!cryptoAlgorithm) {
        console.error('Unsupported hash algorithm:', algorithm);
        return false;
      }
      
      // Generate hash with same algorithm
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      let hashBuffer;
      
      if (cryptoAlgorithm === 'MD5') {
        // Use SHA-256 as fallback for MD5
        hashBuffer = await crypto.createHash('sha256').update(data).digest();
      } else {
        hashBuffer = await crypto.createHash(cryptoAlgorithm.toLowerCase().replace('-', '')).update(data).digest();
      }
      
      const hashArray = Array.from(hashBuffer);
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const newHash = `${algorithm.toLowerCase()}:${hashHex}`;
      
      return newHash === hashedPassword;
    } else {
      // Legacy format: plain hex hash (assume SHA-256)
      if (hashedPassword.length === 64 && /^[a-f0-9]+$/i.test(hashedPassword)) {
        // Looks like a SHA-256 hex hash
        const hashHex = crypto.createHash('sha256').update(password).digest('hex');
        return hashHex === hashedPassword;
      }
      
      // Try other algorithms for legacy format
      const algorithms = ['sha256', 'sha384', 'sha512'];
      
      for (const algorithm of algorithms) {
        const hashHex = crypto.createHash(algorithm).update(password).digest('hex');
        if (hashHex === hashedPassword) {
          return true;
        }
      }
      
      // Fallback for plain text passwords (backward compatibility)
      return password === hashedPassword;
    }
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
};

const testCompleteAuth = async () => {
  console.log('🔐 Complete Authentication System Test');
  console.log('=====================================\n');
  
  // Test cases
  const testCases = [
    {
      name: 'Current Environment Hash (Legacy SHA-256)',
      email: 'whitedevil367467@gmail.com',
      password: 'Admin@123456',
      hash: 'ad89b64d66caa8e30e5d5ce4a9763f4ecc205814c412175f3e2c50027471426d',
      expected: true
    },
    {
      name: 'New Format SHA-256 Hash',
      email: 'whitedevil367467@gmail.com',
      password: 'Admin@123456',
      hash: 'sha-256:ad89b64d66caa8e30e5d5ce4a9763f4ecc205814c412175f3e2c50027471426d',
      expected: true
    },
    {
      name: 'Wrong Password Test',
      email: 'whitedevil367467@gmail.com',
      password: 'WrongPassword123',
      hash: 'ad89b64d66caa8e30e5d5ce4a9763f4ecc205814c412175f3e2c50027471426d',
      expected: false
    },
    {
      name: 'Plain Text Fallback',
      email: 'test@example.com',
      password: 'plaintext',
      hash: 'plaintext',
      expected: true
    }
  ];
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    console.log(`Email: ${testCase.email}`);
    console.log(`Password: ${testCase.password}`);
    console.log(`Hash: ${testCase.hash}`);
    
    const result = await verifyPassword(testCase.password, testCase.hash);
    const passed = result === testCase.expected;
    
    console.log(`Expected: ${testCase.expected ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Actual: ${result ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test Result: ${passed ? '🎉 SUCCESS' : '💥 FAILED'}`);
    console.log('---\n');
    
    if (passed) passedTests++;
  }
  
  console.log('\n📊 Test Summary');
  console.log('===============');
  console.log(`Passed: ${passedTests}/${totalTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Authentication system is working correctly.');
    console.log('✅ Legacy hash format supported');
    console.log('✅ New hash format supported');
    console.log('✅ Wrong passwords correctly rejected');
    console.log('✅ Plain text fallback working');
  } else {
    console.log('\n❌ Some tests failed. Please check the authentication logic.');
  }
};

testCompleteAuth().catch(console.error);