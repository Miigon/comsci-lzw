// Miigon 2020-12-29 ShenZhen University

/*
    This is a javascript implementation of LZW compression algorithm. 
    A 512-entry dictionary is used. Whenever the dictionary is full,
    it resets back to the 512-entry default dictionary.

    References:
    https://www2.cs.duke.edu/csed/curious/compression/lzw.html
    https://cs.carleton.edu/faculty/jondich/courses/cs337_w02/assignments/lzw.html
    http://www.cs.columbia.edu/~allen/S14/NOTES/lzw.pdf
    https://github.com/SteCicero/lz78

    Also See:
    https://www.researchgate.net/publication/265661965_A_Comparative_Study_Of_Text_Compression_Algorithms

*/

// convert string to UTF8 byte array
// (strings in Javascript is stored as UTF16)
let _stringToUtf8 = str => unescape(encodeURIComponent(str));
let _utf8ToString = str => decodeURIComponent(escape(str));;

const DICT_SIZE = 512;
const BITS_PER_ENCODING = Math.ceil(Math.log2(DICT_SIZE));

let _buildDictionary = function() {
    let dict = {};
    for(let i=0;i<256;i++) {
        let ch = String.fromCharCode(i);
        dict[ch] = ch;
    }
    return [dict, 256];
}

// Perform lzw compression
// returns an encoding array
function lzwCompress(inputData) {
    let output = [];
    
    let [dict, dictLen] = _buildDictionary();

    let s = "";
    for(let ch of _stringToUtf8(inputData)){
        if(dict[s + ch]){
            s += ch;
        } else {
            output.push(dict[s]);
            dict[s + ch] = dictLen++;
            s = ch;

            // reset the dictionary when entries exceeds DICT_SIZE
            if(dictLen >= DICT_SIZE) {
                [dict, dictLen] = _buildDictionary();
            }
        }
    }
    if(s) {output.push(dict[s]);}
    return [output, dict];
}

function lzwDecompress(encodingArray) {
    let output = [];
    
    let [dict, dictLen] = _buildDictionary();
    let prevcode = encodingArray[0];
    output.push(prevcode);
    for(let currcode of encodingArray.slice(1)) {
        let data = dict[currcode];
        if(!data) {
            if(currcode == dictLen){
                data = `${prevcode}${prevcode[0]}`;
            } else {
                throw new Error("badly compressed.");
            }
        }
        output.push(data);
        dict[dictLen++] = prevcode + data[0];
        prevcode = data;

        // reset the dictionary when entries exceeds DICT_SIZE
        if(dictLen >= DICT_SIZE) {
            [dict, dictLen] = _buildDictionary();
        }
    }
    return _utf8ToString(output.join(''));
}

// Convert an encoding array (with some 'bytes' being over 255)
// to a conventional byte array (all bytes within 0 to 255)
// WARNING: the code below is a VERY INEFFICIENT way to do it.
function getByteArrayFromEncodingArray(encodingArray) {
    return convertEncodingArrayUnitLength(encodingArray, BITS_PER_ENCODING, 8, false);
}

function getEncodingArrayFromByteArray(byteArray) {
    return convertEncodingArrayUnitLength(byteArray, 8, BITS_PER_ENCODING, true).map(v => v > 255 ? v : String.fromCharCode(v));
}

function convertEncodingArrayUnitLength(encodingArray, originalUnitLength, targetUnitLength, discardIncompleteUnit = false) {
    let binaryFormArr = [];
    for(let k of encodingArray) {
        let ch = typeof(k) == "string" ? k.charCodeAt(0) : k;
        let binArr = [];
        while(ch){
            binArr.push(ch % 2);
            ch >>= 1;
        }
        binaryFormArr.push('0'.repeat(originalUnitLength - binArr.length) + binArr.reverse().join(''))
    }
    let binaryForm = binaryFormArr.join('');

    let output = [];
    for(let i=0;i<binaryForm.length;i+=targetUnitLength){
        let byteBinary = binaryForm.substr(i,targetUnitLength)
        let out = 0;
        if(discardIncompleteUnit && byteBinary.length < targetUnitLength) {continue;}
        for(let j=0;j<targetUnitLength;j++) {
            out <<= 1;
            let bit = byteBinary[j];
            if(bit == '1'){
                out += 1;
            }
        }
        output.push(out);
    }
    return output;
}


function demoForNodeJs() {
    // const TEXT = "the lz78 compression algorithm compresses text to be in a compressed form so the compressed text can take up less space than the uncompressed text";
    // const TEXT = "repeat repeat repeat repeat repeat repeat";
    const TEXT = "fffffffffffff";
    
    console.log("--------------------------------------")
    console.log("original text:\t", TEXT);
    console.log("--------------------------------------")

    // Compression
    let [compressResultEncodingArray] = lzwCompress(TEXT);
    let compressResult = getByteArrayFromEncodingArray(compressResultEncodingArray);
    console.log("compressed:", compressResult);
    console.log("pre-compression: ",_stringToUtf8(TEXT).length);
    console.log("post-compression: ",compressResult.length);
    console.log("compression rate: ", (compressResult.length / _stringToUtf8(TEXT).length * 100).toFixed(2), "%");
    
    // Decompression
    let encodingArray = getEncodingArrayFromByteArray(compressResult);
    console.log("--------------------------------------")
    console.log("decompressed:\t", lzwDecompress(encodingArray));
    console.log("--------------------------------------")
}

if(typeof(window) == 'undefined') {demoForNodeJs()}