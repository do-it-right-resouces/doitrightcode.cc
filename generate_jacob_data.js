const fs = require('fs');

// The data for Jacob Walter Bolden
const preamble = Buffer.from([0x40, 0x0A, 0x1E, 0x0D]); // @\x0A\x1E\x0D
const header = Buffer.from('ANSI 636026100102DL00410378ZF04190062\x0A', 'ascii');

const dlData = Buffer.from(
    'DLDAQB231952418000\x0A' +
    'DCSBOLDEN\x0A' +
    'DACJACOB\x0A' +
    'DADWALTER\x0A' +
    'DBB01011990\x0A' +
    'DBC1\x0A' +
    'DAYBRO\x0A' +
    'DAU070 IN\x0A' +
    'DAG605 AFFIRMED COURT\x0A' +
    'DAITALLAHASSEE\x0A' +
    'DAJFL\x0A' +
    'DAK323990000\x0A' +
    'DCGUSA\x0A' +
    'DBA01012032\x0A' +
    'DBD01092026\x0A' +
    'DCAE\x0A' +
    'DCBNONE\x0A' +
    'DCDNONE\x0A' +
    'DCFE802009203873\x0A' +
    'DDAM\x0A' +
    'DDB03012020\x0A' +
    'DDEN\x0A' +
    'DDK123456789012\x0A' +
    'DDSN\x0A' +
    'DDFN\x0A' +
    'DDUN\x0A' +
    'DDVN\x0A' +
    'DDWN\x0A' +
    'DDXN\x0A\x0D', 'ascii'
);

const zfData = Buffer.from(
    'ZFZFAE\x0A' +
    'ZFB01092026\x0A' +
    'ZFCB231952418000\x0A' +
    'ZFJ000000000\x0A' +
    'ZFKX\x0A\x0D', 'ascii'
);

const terminators = Buffer.from([0x1E, 0x04]); // \x1E\x04

// Combine data for CRC calculation (from @ to \x04)
const crcData = Buffer.concat([preamble, header, dlData, zfData, terminators]);

// CRC-16-CCITT calculation (polynomial 0x1021, initial 0xFFFF, no final XOR)
function crc16ccitt(data) {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
        crc ^= (data[i] << 8);
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
            crc &= 0xFFFF;
        }
    }
    return crc;
}

const crc = crc16ccitt(crcData);
const crcMsb = (crc >> 8) & 0xFF;
const crcLsb = crc & 0xFF;
const crcBytes = Buffer.from([crcMsb, crcLsb]);

// Audit trail
const auditTrail = Buffer.from('FLDMVAUDIT000001', 'ascii');

// Combine all data
const fullData = Buffer.concat([crcData, crcBytes, auditTrail]);

// Pad to 1024 bytes with null bytes
const paddingLength = 1024 - fullData.length;
const padding = Buffer.alloc(paddingLength, 0x00);
const finalData = Buffer.concat([fullData, padding]);

console.log('Data length before padding:', fullData.length);
console.log('Final data length:', finalData.length);
console.log('CRC:', crc.toString(16).toUpperCase());
console.log('CRC bytes:', crcMsb.toString(16).toUpperCase(), crcLsb.toString(16).toUpperCase());

// Write to file
fs.writeFileSync('jacob_bolden_pdf417.bin', finalData);
console.log('Binary data written to jacob_bolden_pdf417.bin');

// Also create a hex dump
let hexDump = '';
for (let i = 0; i < finalData.length; i += 16) {
    const chunk = finalData.slice(i, i + 16);
    const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = Array.from(chunk).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
    hexDump += `${i.toString(16).padStart(8, '0')}: ${hex.padEnd(47)} ${ascii}\n`;
}

fs.writeFileSync('jacob_bolden_hex_dump.txt', hexDump);
console.log('Hex dump written to jacob_bolden_hex_dump.txt');