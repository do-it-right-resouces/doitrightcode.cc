const fs = require('fs');
const { createCanvas } = require('canvas');
const bwipjs = require('bwip-js');

// Read the binary data
const binaryData = fs.readFileSync('jacob_bolden_pdf417.bin');

// Convert to base64 for bwip-js (since it expects a string)
const base64Data = binaryData.toString('base64');

console.log('Binary data length:', binaryData.length);
console.log('Base64 length:', base64Data.length);

// Create canvas
const canvas = createCanvas(800, 600);

// Generate PDF417 barcode
bwipjs.toCanvas(canvas, {
    bcid: 'pdf417',
    text: base64Data,
    eclevel: 5,
    columns: 15,
    rows: 0,
    scale: 2,
    height: 6,
    includetext: false,
    parsefnc: false,
    encoding: 'base256'  // Use base256 encoding for binary data
});

// Save as PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('jacob_bolden_pdf417.png', buffer);

console.log('PDF417 barcode generated and saved as jacob_bolden_pdf417.png');

// Also try with raw binary mode
try {
    const canvas2 = createCanvas(800, 600);
    bwipjs.toCanvas(canvas2, {
        bcid: 'pdf417',
        text: binaryData,  // Pass binary data directly
        eclevel: 5,
        columns: 15,
        rows: 0,
        scale: 2,
        height: 6,
        includetext: false,
        parsefnc: false,
        encoding: 'raw'  // Raw binary mode
    });

    const buffer2 = canvas2.toBuffer('image/png');
    fs.writeFileSync('jacob_bolden_pdf417_raw.png', buffer2);
    console.log('Raw binary PDF417 barcode generated and saved as jacob_bolden_pdf417_raw.png');
} catch (e) {
    console.log('Raw binary mode failed:', e.message);
}