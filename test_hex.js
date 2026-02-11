
function hexToBytes(hex) {
    const arr = hex.match(/.{1,2}/g) || [];
    return new Uint8Array(arr.map(b => {
        const val = parseInt(b, 16);
        return isNaN(val) ? 0 : val;
    }));
}

// Test cases
console.log('Testing hexToBytes:');
console.log('null input:', Array.from(hexToBytes(null)));
console.log('empty string:', Array.from(hexToBytes('')));
console.log('valid hex:', Array.from(hexToBytes('48656c6c6f')));
console.log('invalid hex:', Array.from(hexToBytes('48656c6c6fXX')));
console.log('odd length:', Array.from(hexToBytes('48656c6c6')));
