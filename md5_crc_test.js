// Quick Node test for md5 and crc16ccitt from federal.html
function md5(string) {
    function rotateLeft(value, amount) {
        return (value << amount) | (value >>> (32 - amount));
    }

    function addUnsigned(x, y) {
        const lsw = (x & 0xFFFF) + (y & 0xFFFF);
        const msw = (x >>> 16) + (y >>> 16) + (lsw >>> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }

    function F(x, y, z) { return (x & y) | ((~x) & z); }
    function G(x, y, z) { return (x & z) | (y & (~z)); }
    function H(x, y, z) { return x ^ y ^ z; }
    function I(x, y, z) { return y ^ (x | (~z)); }

    function FF(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function GG(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function HH(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function II(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function convertToWordArray(string) {
        const l = string.length;
        const n = (((l + 8) >>> 6) + 1) * 16;
        const wordArray = new Array(n).fill(0);
        for (let i = 0; i < l; i++) {
            wordArray[i >> 2] |= (string.charCodeAt(i) & 0xFF) << ((i % 4) * 8);
        }
        wordArray[l >> 2] |= 0x80 << ((l % 4) * 8);
        wordArray[n - 2] = (l * 8) & 0xFFFFFFFF;
        wordArray[n - 1] = ((l * 8) / 0x100000000) >>> 0;
        return wordArray;
    }

    function wordToHex(value) {
        let hex = '';
        for (let i = 0; i < 4; i++) {
            const byte = (value >>> (i * 8)) & 0xFF;
            hex += ('0' + byte.toString(16)).slice(-2);
        }
        return hex;
    }

    const x = convertToWordArray(string);
    let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;

    for (let i = 0; i < x.length; i += 16) {
        const oldA = a, oldB = b, oldC = c, oldD = d;
        a = FF(a, b, c, d, x[i + 0], 7, 0xD76AA478);
        d = FF(d, a, b, c, x[i + 1], 12, 0xE8C7B756);
        c = FF(c, d, a, b, x[i + 2], 17, 0x242070DB);
        b = FF(b, c, d, a, x[i + 3], 22, 0xC1BDCEEE);
        a = FF(a, b, c, d, x[i + 4], 7, 0xF57C0FAF);
        d = FF(d, a, b, c, x[i + 5], 12, 0x4787C62A);
        c = FF(c, d, a, b, x[i + 6], 17, 0xA8304613);
        b = FF(b, c, d, a, x[i + 7], 22, 0xFD469501);
        a = FF(a, b, c, d, x[i + 8], 7, 0x698098D8);
        d = FF(d, a, b, c, x[i + 9], 12, 0x8B44F7AF);
        c = FF(c, d, a, b, x[i + 10], 17, 0xFFFF5BB1);
        b = FF(b, c, d, a, x[i + 11], 22, 0x895CD7BE);
        a = FF(a, b, c, d, x[i + 12], 7, 0x6B901122);
        d = FF(d, a, b, c, x[i + 13], 12, 0xFD987193);
        c = FF(c, d, a, b, x[i + 14], 17, 0xA679438E);
        b = FF(b, c, d, a, x[i + 15], 22, 0x49B40821);

        a = GG(a, b, c, d, x[i + 1], 5, 0xF61E2562);
        d = GG(d, a, b, c, x[i + 6], 9, 0xC040B340);
        c = GG(c, d, a, b, x[i + 11], 14, 0x265E5A51);
        b = GG(b, c, d, a, x[i + 0], 20, 0xE9B6C7AA);
        a = GG(a, b, c, d, x[i + 5], 5, 0xD62F105D);
        d = GG(d, a, b, c, x[i + 10], 9, 0x2441453);
        c = GG(c, d, a, b, x[i + 15], 14, 0xD8A1E681);
        b = GG(b, c, d, a, x[i + 4], 20, 0xE7D3FBC8);
        a = GG(a, b, c, d, x[i + 9], 5, 0x21E1CDE6);
        d = GG(d, a, b, c, x[i + 14], 9, 0xC33707D6);
        c = GG(c, d, a, b, x[i + 3], 14, 0xF4D50D87);
        b = GG(b, c, d, a, x[i + 8], 20, 0x455A14ED);
        a = GG(a, b, c, d, x[i + 13], 5, 0xA9E3E905);
        d = GG(d, a, b, c, x[i + 2], 9, 0xFCEFA3F8);
        c = GG(c, d, a, b, x[i + 7], 14, 0x676F02D9);
        b = GG(b, c, d, a, x[i + 12], 20, 0x8D2A4C8A);

        a = HH(a, b, c, d, x[i + 5], 4, 0xFFFA3942);
        d = HH(d, a, b, c, x[i + 8], 11, 0x8771F681);
        c = HH(c, d, a, b, x[i + 11], 16, 0x6D9D6122);
        b = HH(b, c, d, a, x[i + 14], 23, 0xFDE5380C);
        a = HH(a, b, c, d, x[i + 1], 4, 0xA4BEEA44);
        d = HH(d, a, b, c, x[i + 4], 11, 0x4BDECFA9);
        c = HH(c, d, a, b, x[i + 7], 16, 0xF6BB4B60);
        b = HH(b, c, d, a, x[i + 10], 23, 0xBEBFBC70);
        a = HH(a, b, c, d, x[i + 13], 4, 0x289B7EC6);
        d = HH(d, a, b, c, x[i + 0], 11, 0xEAA127FA);
        c = HH(c, d, a, b, x[i + 3], 16, 0xD4EF3085);
        b = HH(b, c, d, a, x[i + 6], 23, 0x4881D05);
        a = HH(a, b, c, d, x[i + 9], 4, 0xD9D4D039);
        d = HH(d, a, b, c, x[i + 12], 11, 0xE6DB99E5);
        c = HH(c, d, a, b, x[i + 15], 16, 0x1FA27CF8);
        b = HH(b, c, d, a, x[i + 2], 23, 0xC4AC5665);

        a = II(a, b, c, d, x[i + 0], 6, 0xF4292244);
        d = II(d, a, b, c, x[i + 7], 10, 0x432AFF97);
        c = II(c, d, a, b, x[i + 14], 15, 0xAB9423A7);
        b = II(b, c, d, a, x[i + 5], 21, 0xFC93A039);
        a = II(a, b, c, d, x[i + 12], 6, 0x655B59C3);
        d = II(d, a, b, c, x[i + 3], 10, 0x8F0CCC92);
        c = II(c, d, a, b, x[i + 10], 15, 0xFFEFF47D);
        b = II(b, c, d, a, x[i + 1], 21, 0x85845DD1);
        a = II(a, b, c, d, x[i + 8], 6, 0x6FA87E4F);
        d = II(d, a, b, c, x[i + 15], 10, 0xFE2CE6E0);
        c = II(c, d, a, b, x[i + 6], 15, 0xA3014314);
        b = II(b, c, d, a, x[i + 13], 21, 0x4E0811A1);
        a = II(a, b, c, d, x[i + 4], 6, 0xF7537E82);
        d = II(d, a, b, c, x[i + 11], 10, 0xBD3AF235);
        c = II(c, d, a, b, x[i + 2], 15, 0x2AD7D2BB);
        b = II(b, c, d, a, x[i + 9], 21, 0xEB86D391);

        a = addUnsigned(a, oldA);
        b = addUnsigned(b, oldB);
        c = addUnsigned(c, oldC);
        d = addUnsigned(d, oldD);
    }

    return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

function crc16ccitt(data) {
    let crc = 0xFFFF;
    const poly = 0x1021;
    
    for (let i = 0; i < data.length; i++) {
        const byte = typeof data[i] === 'string' ? data.charCodeAt(i) : data[i];
        crc ^= (byte << 8);
        
        for (let bit = 0; bit < 8; bit++) {
            if (crc & 0x8000) {
                crc = ((crc << 1) ^ poly) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    
    return crc;
}

// Tests
const testData = '123456789';
console.log('Expected CRC: 0x29B1, Actual:', '0x' + crc16ccitt(testData).toString(16).toUpperCase());
const testString = 'The quick brown fox jumps over the lazy dog';
console.log('Expected MD5: 9e107d9d372bb6826bd81d3542a419d6, Actual:', md5(testString));
console.log('Large MD5 performance test (10k A)...');
const largeData = 'A'.repeat(10000);
console.time('md5'); md5(largeData); console.timeEnd('md5');
console.time('crc'); crc16ccitt(largeData); console.timeEnd('crc');
