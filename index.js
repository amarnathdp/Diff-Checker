const express = require('express');
const multer = require('multer');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());

const upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        const fileType = file.mimetype;
        if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileType === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only .docx and PDF files are allowed'), false);
        }
    }
});

app.post('/upload', upload.fields([{ name: 'wordFile' }, { name: 'pdfFile' }]), async (req, res) => {
    try {
        if (!req.files || !req.files['wordFile'] || !req.files['pdfFile']) {
            throw new Error('Both Word (.docx) and PDF files must be uploaded.');
        }
        const wordFilePath = req.files['wordFile'][0].path;
        const pdfFilePath = req.files['pdfFile'][0].path;
        // Extract text from Word document
        const wordText = await extractTextFromWord(wordFilePath);
        // Extract text from PDF document
        const pdfText = await extractTextFromPdf(pdfFilePath);

        const differences = compareTexts(wordText, pdfText);

        fs.unlinkSync(wordFilePath);
        fs.unlinkSync(pdfFilePath);

        res.json({ differences });
    } catch (error) {
        console.error('Error processing files:', error);
        res.status(500).json({ message: error.message });
    }
});

async function extractTextFromWord(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error('Word file does not exist or was not uploaded correctly.');
    }
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        //    return result.value; // Extracted text
        return normalizeText(result.value);
    } catch (error) {
        console.error('Error during Word text extraction:', error);
        throw new Error('Failed to extract text from Word file. Make sure it is a valid .docx file.');
    }
}

async function extractTextFromPdf(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error('PDF file does not exist or was not uploaded correctly.');
    }
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        //    return data.text; // Extracted text
        return normalizeText(data.text);
    } catch (error) {
        console.error('Error during PDF text extraction:', error);
        throw new Error('Failed to extract text from PDF file.');
    }
}

function normalizeText(text) {
    return text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();
}


function compareTexts(text1, text2) {
    const diffs = [];
    const text1Lines = text1.split('\n');
    const text2Lines = text2.split('\n');
    const maxLength = Math.max(text1Lines.length, text2Lines.length);
    for (let i = 0; i < maxLength; i++) {
        if (text1Lines[i] !== text2Lines[i]) {
            diffs.push({
                line: i + 1,
                wordText: text1Lines[i] || '',
                pdfText: text2Lines[i] || ''
            });
        }
    }
    const text1Words = text1Lines[0].split(' ');
    const text2Words = text2Lines[0].split(' ');
    const missingWords = text2Words.filter(words => !text1Words.includes(words));
    diffs[0]['differentWords'] = missingWords;

    return diffs;
}

// function compareTexts(text1, text2) {
//     const diffs = [];
//     const text1Lines = text1.split('\n');
//     const text2Lines = text2.split('\n');
//     const maxLength = Math.max(text1Lines.length, text2Lines.length);
//     for (let i = 0; i < maxLength; i++) {
//         const text1Line = text1Lines[i] || '';
//         const text2Line = text2Lines[i] || '';
//         // Split the lines into words
//         const text1Words = text1Line.split(' ');
//         const text2Words = text2Line.split(' ');
//         // const maxWordsLength = Math.max(text1Words.length, text2Words.length);
//         // // Compare words and identify differences
//         // for (let j = 0; j < maxWordsLength; j++) {
//         //     if (text1Words[j] !== text2Words[j]) {
//         //         diffs.push({
//         //             line: i + 1,                // Line number
//         //             wordIndex: j + 1,           // Word position in the line
//         //             wordText: text1Words[j] || '', // Text from Word
//         //             pdfText: text2Words[j] || ''  // Text from PDF
//         //         });
//         //     }
//         // }
//         // const wordDiffs = findWordDifferencesWithLCS(text1Words, text2Words);
//         // if (wordDiffs.length > 0) {
//         //     diffs.push({
//         //         line: i + 1,  // Line number
//         //         differences: wordDiffs
//         //     });
//         // }

//         const missingFruits = text2Words.filter(fruit => !text1Words.includes(fruit));
//         console.log(missingFruits); // Output: ['pineapple']
//         const missingWords = [];
//         for (let i = 0; i < Math.max(text1Words.length, text2Words.length); i++) {
//             if (text1Words[i] !== text2Words[i]) {
//                 missingWords.push(text1Words[i]);  // Push the differing word from text1
//             }
//         }

//         console.log(missingWords);




//     }
//     return diffs;  // Return differences
// }

// // function findWordDifferencesWithLCS(words1, words2) {
// //     const lcsResult = lcs(words1, words2);
// //     const diffs = [];
// //     let i = 0, j = 0;
// //     for (let match of lcsResult) {
// //         // Add missing words from words1
// //         while (i < match.index1) {
// //             diffs.push({
// //                 type: 'missing',
// //                 word: words1[i],
// //                 position: i + 1
// //             });
// //             i++;
// //         }
// //         // Add extra words from words2
// //         while (j < match.index2) {
// //             diffs.push({
// //                 type: 'extra',
// //                 word: words2[j],
// //                 position: j + 1
// //             });
// //             j++;
// //         }
// //         // Move both pointers past the matched word
// //         i++;
// //         j++;
// //     }
// //     // Add any remaining words from words1 (missing)
// //     while (i < words1.length) {
// //         diffs.push({
// //             type: 'missing',
// //             word: words1[i],
// //             position: i + 1
// //         });
// //         i++;
// //     }
// //     // Add any remaining words from words2 (extra)
// //     while (j < words2.length) {
// //         diffs.push({
// //             type: 'extra',
// //             word: words2[j],
// //             position: j + 1
// //         });
// //         j++;
// //     }
// //     return diffs;
// // }
// // // Longest Common Subsequence (LCS) function
// // function lcs(arr1, arr2) {
// //     const m = arr1.length;
// //     const n = arr2.length;
// //     const lcsMatrix = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
// //     // Fill the LCS matrix
// //     for (let i = 1; i <= m; i++) {
// //         for (let j = 1; j <= n; j++) {
// //             if (arr1[i - 1] === arr2[j - 1]) {
// //                 lcsMatrix[i][j] = lcsMatrix[i - 1][j - 1] + 1;
// //             } else {
// //                 lcsMatrix[i][j] = Math.max(lcsMatrix[i - 1][j], lcsMatrix[i][j - 1]);
// //             }
// //         }
// //     }
// //     // Backtrack to find the matching subsequence
// //     const lcsResult = [];
// //     let i = m, j = n;
// //     while (i > 0 && j > 0) {
// //         if (arr1[i - 1] === arr2[j - 1]) {
// //             lcsResult.unshift({ word: arr1[i - 1], index1: i - 1, index2: j - 1 });
// //             i--;
// //             j--;
// //         } else if (lcsMatrix[i - 1][j] > lcsMatrix[i][j - 1]) {
// //             i--;
// //         } else {
// //             j--;
// //         }
// //     }
// //     return lcsResult;
// // }

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
