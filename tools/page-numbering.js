document.addEventListener('DOMContentLoaded', function() {
    // Initialize PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    // DOM Elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const numberingOptions = document.getElementById('numberingOptions');
    const position = document.getElementById('position');
    const format = document.getElementById('format');
    const startNumber = document.getElementById('startNumber');
    const fontSize = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const fontColor = document.getElementById('fontColor');
    const pageRange = document.getElementById('pageRange');
    const previewArea = document.getElementById('previewArea');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const addNumbers = document.getElementById('addNumbers');
    const clearBtn = document.getElementById('clearBtn');
    const progressArea = document.getElementById('progressArea');
    const progressBar = progressArea.querySelector('.progress-bar');
    const progressText = document.getElementById('progressText');

    // State
    let currentFile = null;
    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;

    // Event Listeners
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) handleFileSelection(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });

    fontSize.addEventListener('input', (e) => {
        fontSizeValue.textContent = `${e.target.value}pt`;
        updatePreview();
    });

    [position, format, startNumber, fontColor, pageRange].forEach(element => {
        element.addEventListener('change', updatePreview);
    });

    prevPage.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updatePreview();
        }
    });

    nextPage.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            updatePreview();
        }
    });

    clearBtn.addEventListener('click', () => {
        currentFile = null;
        pdfDoc = null;
        currentPage = 1;
        totalPages = 0;
        fileInput.value = '';
        numberingOptions.classList.add('d-none');
        previewArea.innerHTML = '';
    });

    addNumbers.addEventListener('click', async () => {
        if (!currentFile || !pdfDoc) return;

        try {
            progressArea.classList.remove('d-none');
            progressBar.style.width = '0%';
            progressText.textContent = 'Reading PDF file...';

            const arrayBuffer = await readFileAsArrayBuffer(currentFile);
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pages = pdfDoc.getPages();
            const helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            
            // Parse page range
            const pageNumbers = pageRange.value.trim() ? 
                parsePageRange(pageRange.value, pages.length) : 
                Array.from({length: pages.length}, (_, i) => i);

            // Get number format function
            const getNumber = createNumberFormatter(format.value);
            
            // Process each page
            for (let i = 0; i < pageNumbers.length; i++) {
                const pageIndex = pageNumbers[i];
                const page = pages[pageIndex];
                const { width, height } = page.getSize();
                const number = getNumber(parseInt(startNumber.value) + i);
                
                // Calculate position
                const coords = getPositionCoordinates(position.value, width, height);
                
                // Add page number
                page.drawText(number, {
                    x: coords.x,
                    y: coords.y,
                    size: parseInt(fontSize.value),
                    font: helveticaFont,
                    color: PDFLib.rgb(...hexToRgb(fontColor.value)),
                });

                // Update progress
                const progress = ((i + 1) / pageNumbers.length) * 80;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `Processing page ${i + 1} of ${pageNumbers.length}...`;
            }

            progressBar.style.width = '90%';
            progressText.textContent = 'Creating download file...';

            // Save the PDF
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = currentFile.name.replace('.pdf', '_numbered.pdf');
            link.click();

            // Clean up
            URL.revokeObjectURL(url);
            progressText.textContent = 'Page numbering complete!';
            progressBar.style.width = '100%';
            
            setTimeout(() => {
                progressArea.classList.add('d-none');
            }, 2000);

        } catch (error) {
            console.error('Error:', error);
            progressText.textContent = 'Error adding page numbers. Please try again.';
            progressBar.classList.add('bg-danger');
        }
    });

    // Helper Functions
    async function handleFileSelection(file) {
        if (!file.type.includes('pdf')) {
            alert('Please select a PDF file.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB.');
            return;
        }

        currentFile = file;
        try {
            const arrayBuffer = await file.arrayBuffer();
            pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
            totalPages = pdfDoc.numPages;
            currentPage = 1;
            pageInfo.textContent = `${currentPage} / ${totalPages}`;
            numberingOptions.classList.remove('d-none');
            updatePreview();
        } catch (error) {
            console.error('Error loading PDF:', error);
            alert('Error loading PDF file. Please try another file.');
        }
    }

    async function updatePreview() {
        if (!pdfDoc) return;

        try {
            const page = await pdfDoc.getPage(currentPage);
            const viewport = page.getViewport({ scale: 1 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Set canvas size to match page size
            const scale = previewArea.offsetWidth / viewport.width;
            canvas.width = viewport.width * scale;
            canvas.height = viewport.height * scale;
            
            // Render PDF page
            const scaledViewport = page.getViewport({ scale });
            await page.render({
                canvasContext: context,
                viewport: scaledViewport
            }).promise;

            // Add page number preview
            const number = createNumberFormatter(format.value)(parseInt(startNumber.value) + currentPage - 1);
            context.font = `${fontSize.value}px Helvetica`;
            context.fillStyle = fontColor.value;
            
            const coords = getPositionCoordinates(position.value, canvas.width, canvas.height);
            context.fillText(number, coords.x, coords.y);

            // Update preview
            previewArea.innerHTML = '';
            previewArea.appendChild(canvas);
            pageInfo.textContent = `${currentPage} / ${totalPages}`;

        } catch (error) {
            console.error('Preview error:', error);
        }
    }

    function createNumberFormatter(format) {
        switch (format) {
            case 'i':
                return num => toRoman(num).toLowerCase();
            case 'I':
                return num => toRoman(num);
            case 'a':
                return num => toAlpha(num).toLowerCase();
            case 'A':
                return num => toAlpha(num);
            default:
                return num => num.toString();
        }
    }

    function toRoman(num) {
        const roman = {
            M: 1000, CM: 900, D: 500, CD: 400,
            C: 100, XC: 90, L: 50, XL: 40,
            X: 10, IX: 9, V: 5, IV: 4, I: 1
        };
        let str = '';
        for (let i of Object.keys(roman)) {
            let q = Math.floor(num / roman[i]);
            num -= q * roman[i];
            str += i.repeat(q);
        }
        return str;
    }

    function toAlpha(num) {
        let result = '';
        while (num > 0) {
            num--;
            result = String.fromCharCode(65 + (num % 26)) + result;
            num = Math.floor(num / 26);
        }
        return result;
    }

    function parsePageRange(rangeText, maxPages) {
        const pages = new Set();
        const ranges = rangeText.split(',').map(r => r.trim());
        
        for (const range of ranges) {
            if (range.includes('-')) {
                const [start, end] = range.split('-').map(n => parseInt(n));
                for (let i = start; i <= end && i <= maxPages; i++) {
                    if (i > 0) pages.add(i - 1);
                }
            } else {
                const page = parseInt(range);
                if (page > 0 && page <= maxPages) {
                    pages.add(page - 1);
                }
            }
        }
        
        return Array.from(pages).sort((a, b) => a - b);
    }

    function getPositionCoordinates(position, width, height) {
        const margin = 30;
        const coords = {};

        if (position.includes('top')) {
            coords.y = height - margin;
        } else if (position.includes('bottom')) {
            coords.y = margin;
        } else {
            coords.y = height / 2;
        }

        if (position.includes('left')) {
            coords.x = margin;
        } else if (position.includes('right')) {
            coords.x = width - margin;
        } else {
            coords.x = width / 2;
        }

        return coords;
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : [0, 0, 0];
    }

    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
}); 