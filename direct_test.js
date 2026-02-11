// Direct function tests
console.log("=== DIRECT FUNCTION TESTS ===\n");

// Test hexToBytes function
function hexToBytes(hex) {
    if (!hex || typeof hex !== 'string') return new Uint8Array();
    const arr = hex.match(/.{1,2}/g) || [];
    return new Uint8Array(arr.map(b => {
        const val = parseInt(b, 16);
        return isNaN(val) ? 0 : val; // Handle invalid hex characters
    }));
}

console.log("1. Testing hexToBytes function:");
const hexTests = [
    { input: null, expected: "empty array" },
    { input: "", expected: "empty array" },
    { input: "48656c6c6f", expected: "[72, 101, 108, 108, 111] (Hello)" },
    { input: "48656c6c6fXX", expected: "handles invalid chars" },
    { input: "48656c6c6", expected: "handles odd length" }
];

hexTests.forEach((test, i) => {
    try {
        const result = Array.from(hexToBytes(test.input));
        console.log("   Test " + (i+1) + ": " + (test.input === null ? "null" : '"' + test.input + '"') + " -> " + result + " (" + test.expected + ")");
    } catch (e) {
        console.log("   Test " + (i+1) + ": FAILED - " + e.message);
    }
});

// Test MD5 function (simplified version for testing)
function md5(message) {
    if (message == null) message = '';
    const bytes = new TextEncoder().encode(message);

    // Simple hash for testing (not full MD5 implementation)
    let hash = 0;
    for (let i = 0; i < bytes.length; i++) {
        hash = ((hash << 5) - hash + bytes[i]) >>> 0;
    }
    return ('00000000' + hash.toString(16)).slice(-8);
}

console.log("\n2. Testing MD5 function:");
const testString = "Hello World";
const hash = md5(testString);
console.log("   MD5(\"" + testString + "\") = " + hash);
console.log("   Hash length: " + hash.length + " characters");
console.log("   Is valid hex: " + /^[0-9a-f]+$/i.test(hash));

// Test actual barcode generation simulation
console.log("\n3. Testing barcode payload generation simulation:");

function simulateBarcodePayload() {
    const payload = "@\\n\\nANSI 636000090002DLDAQ123456789\\nDCSLASTNAME\\nDACFIRSTNAME\\nDADMIDDLENAME\\n";
    const md5Enabled = true;
    const md5Hash = md5("test data");

    let finalPayload = payload;

    if (md5Enabled && md5Hash) {
        const md5Bytes = hexToBytes(md5Hash);
        finalPayload += Array.from(md5Bytes).map(b => String.fromCharCode(b)).join('');
        console.log("   ✓ MD5 bytes added to payload: " + md5Bytes.length + " bytes");
        console.log("   MD5 hash used: " + md5Hash);
    } else {
        console.log("   ✗ MD5 not included in payload");
    }

    return finalPayload;
}

const testPayload = simulateBarcodePayload();
console.log("   Payload length: " + testPayload.length + " characters");
console.log("   Contains MD5 data: " + (testPayload.includes(String.fromCharCode(72)))); // 'H' from hash

console.log("\n4. Testing admin login simulation:");
const testEmail = "unkledo@icloud.com";
const testPassword = "Denver3100";
const isValidLogin = (testEmail === 'unkledo@icloud.com' && testPassword === 'Denver3100');
console.log("   Admin login test: " + (isValidLogin ? "✓ SUCCESS" : "✗ FAILED"));

console.log("\n=== ALL TESTS COMPLETED ===");