import '@testing-library/jest-dom';

// jsdom に TextEncoder/TextDecoder がないため polyfill (viem が使用)
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}
