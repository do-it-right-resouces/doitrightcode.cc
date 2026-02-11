// Test script for barcode generator functionality
const fs = require("fs");

// Mock DOM elements
global.document = {
    getElementById: (id) => ({
        value: "",
        checked: true,
        style: {},
        innerHTML: "",
        addEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        classList: { add: () => {}, remove: () => {}, contains: () => false }
    }),
    createElement: () => ({
        style: {},
        getContext: () => ({
            clearRect: () => {},
            fillRect: () => {},
            drawImage: () => {}
        })
    }),
    querySelector: () => null,
    querySelectorAll: () => []
};

global.window = {
    crypto: {
        getRandomValues: (arr) => {
            for (let i = 0; i < arr.length; i++) {
                arr[i] = Math.floor(Math.random() * 256);
            }
        },
        subtle: {
            encrypt: async () => new Uint8Array([1,2,3,4]),
            decrypt: async () => new Uint8Array([1,2,3,4]),
            importKey: async () => "mock-key",
            sign: async () => new Uint8Array([1,2,3,4]),
            verify: async () => true
        }
    },
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    },
    alert: (msg) => console.log("ALERT:", msg),
    btoa: (str) => Buffer.from(str).toString("base64"),
    atob: (str) => Buffer.from(str, "base64").toString()
};

// Load the HTML content and extract JavaScript
const htmlContent = fs.readFileSync("index.html", "utf8");
const scriptMatches = htmlContent.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
let jsCode = "";

if (scriptMatches) {
    scriptMatches.forEach(match => {
        const scriptContent = match.replace(/<script[^>]*>/, "").replace(/<\/script>/, "");
        jsCode += scriptContent + "\n";
    });
}

console.log("=== BARCODE GENERATOR FUNCTIONALITY TEST ===\n");

// Test hexToBytes function
console.log("1. Testing hexToBytes function:");
try {
    // Extract hexToBytes function
    const hexToBytesMatch = jsCode.match(/function hexToBytes\([^}]+\}/);
    if (hexToBytesMatch) {
        eval(hexToBytesMatch[0]);

        const testCases = [
            { input: null, expected: "empty array" },
            { input: "", expected: "empty array" },
            { input: "48656c6c6f", expected: "[72, 101, 108, 108, 111] (Hello)" },
            { input: "48656c6c6fXX", expected: "handles invalid chars" },
            { input: "48656c6c6", expected: "handles odd length" }
        ];

        testCases.forEach((test, i) => {
            try {
                const result = Array.from(hexToBytes(test.input));
                console.log("   Test " + (i+1) + ": " + test.input + " -> " + result + " (" + test.expected + ")");
            } catch (e) {
                console.log("   Test " + (i+1) + ": FAILED - " + e.message);
            }
        });
    } else {
        console.log("   hexToBytes function not found");
    }
} catch (e) {
    console.log("   hexToBytes test failed:", e.message);
}

console.log("\n2. Testing MD5 function:");
try {
    const md5Match = jsCode.match(/function md5\([^}]+\}/);
    if (md5Match) {
        eval(md5Match[0]);

        const testString = "Hello World";
        const hash = md5(testString);
        console.log("   MD5(\"" + testString + "\") = " + hash);
        console.log("   Hash length: " + hash.length + " characters");
        console.log("   Is valid hex: " + /^[0-9a-f]+$/i.test(hash));
    } else {
        console.log("   MD5 function not found");
    }
} catch (e) {
    console.log("   MD5 test failed:", e.message);
}

console.log("\n3. Checking MD5 integration in barcode generation:");
const md5PayloadMatch = jsCode.match(/if \(md5Enabled && md5Hash\)[^}]+}/);
if (md5PayloadMatch) {
    console.log("   ✓ MD5 payload inclusion found in code");
    console.log("   Code snippet:", md5PayloadMatch[0].substring(0, 100) + "...");
} else {
    console.log("   ✗ MD5 payload inclusion NOT found");
}

console.log("\n4. Checking for admin authentication:");
const adminCheck = jsCode.match(/unkledo@icloud\.com.*Denver3100/);
if (adminCheck) {
    console.log("   ✓ Admin credentials found in code");
} else {
    console.log("   ✗ Admin credentials NOT found");
}

console.log("\n5. Checking mobile responsiveness:");
const mobileCSS = htmlContent.match(/@media \(max-width: 768px\)/);
if (mobileCSS) {
    console.log("   ✓ Mobile CSS responsive rules found");
} else {
    console.log("   ✗ Mobile CSS NOT found");
}

console.log("\n=== TEST COMPLETE ===");