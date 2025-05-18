document.addEventListener('DOMContentLoaded', function() {
    // Initialize PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    // DOM Elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const ocrOptions = document.getElementById('ocrOptions');
    const language = document.getElementById('language');
    const outputFormat = document.getElementById('outputFormat');
    const pageRange = document.getElementById('pageRange');
    const previewArea = document.getElementById('previewArea');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const startOcr = document.getElementById('startOcr');
    const clearBtn = document.getElementById('clearBtn');
    const progressArea = document.getElementById('progressArea');
    const progressBar = progressArea.querySelector('.progress-bar');
    const progressText = document.getElementById('progressText');

    // State
    let currentFile = null;
    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let worker = null;

    // Initialize Tesseract worker
    async function initWorker() {
        if (!worker) {
            worker = await Tesseract.createWorker();
            await worker.loadLanguage(language.value);
            await worker.initialize(language.value);
        }
    }

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

    language.addEventListener('change', async () => {
        if (worker) {
            await worker.terminate();
            worker = null;
        }
        await initWorker();
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

    clearBtn.addEventListener('click', async () => {
        currentFile = null;
        pdfDoc = null;
        currentPage = 1;
        totalPages = 0;
        fileInput.value = '';
        ocrOptions.classList.add('d-none');
        previewArea.innerHTML = '';
        if (worker) {
            await worker.terminate();
            worker = null;
        }
    });

    startOcr.addEventListener('click', async () => {
        if (!currentFile || !pdfDoc) return;

        try {
            progressArea.classList.remove('d-none');
            progressBar.style.width = '0%';
            progressText.textContent = 'Initializing OCR...';

            // Initialize worker if not already done
            await initWorker();

            // Load PDF
            const arrayBuffer = await readFileAsArrayBuffer(currentFile);
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pages = pdfDoc.getPages();
            
            // Parse page range
            const pageNumbers = pageRange.value.trim() ? 
                parsePageRange(pageRange.value, pages.length) : 
                Array.from({length: pages.length}, (_, i) => i);

            // Process each page
            let extractedText = '';
            for (let i = 0; i < pageNumbers.length; i++) {
                const pageIndex = pageNumbers[i];
                const page = pages[pageIndex];
                
                // Get page dimensions
                const { width, height } = page.getSize();
                
                // Create a canvas to process the page
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = width * 2; // Higher resolution for better OCR
                canvas.height = height * 2;

                // Render PDF page to canvas
                const pdfPage = await pdfDoc.getPage(pageIndex + 1);
                const viewport = pdfPage.getViewport({ scale: 2 });
                await pdfPage.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                // Perform OCR
                progressText.textContent = `Processing page ${i + 1} of ${pageNumbers.length}...`;
                const result = await worker.recognize(canvas);
                extractedText += `Page ${pageIndex + 1}:\n${result.data.text}\n\n`;

                // Update progress
                const progress = ((i + 1) / pageNumbers.length) * 80;
                progressBar.style.width = `${progress}%`;
            }

            progressBar.style.width = '90%';
            progressText.textContent = 'Creating output file...';

            if (outputFormat.value === 'text') {
                // Save as text file
                const blob = new Blob([extractedText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = currentFile.name.replace('.pdf', '_ocr.txt');
                link.click();
                URL.revokeObjectURL(url);
            } else {
                // Create searchable PDF
                const newPdf = await PDFLib.PDFDocument.create();
                
                for (let i = 0; i < pageNumbers.length; i++) {
                    const pageIndex = pageNumbers[i];
                    const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageIndex]);
                    const page = newPdf.addPage(copiedPage);
                    
                    // Add invisible text layer
                    const helveticaFont = await newPdf.embedFont(PDFLib.StandardFonts.Helvetica);
                    const { width, height } = page.getSize();
                    
                    // Add extracted text as invisible layer
                    page.drawText(extractedText.split('\n\n')[i], {
                        x: 0,
                        y: height,
                        size: 0,
                        font: helveticaFont,
                        color: PDFLib.rgb(0, 0, 0),
                        opacity: 0
                    });
                }

                // Add watermark
                const helveticaFont = await newPdf.embedFont(PDFLib.StandardFonts.Helvetica);
                newPdf.getPages().forEach(page => {
                    page.drawText('Created with PDFRocket.site by Aqib Chaudhary', {
                        x: 10,
                        y: 10,
                        size: 8,
                        font: helveticaFont,
                        color: PDFLib.rgb(0.6, 0.6, 0.6),
                    });
                });

                // Save the PDF
                const pdfBytes = await newPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = currentFile.name.replace('.pdf', '_searchable.pdf');
                link.click();
                URL.revokeObjectURL(url);
            }

            progressText.textContent = 'OCR complete!';
            progressBar.style.width = '100%';
            
            setTimeout(() => {
                progressArea.classList.add('d-none');
            }, 2000);

        } catch (error) {
            console.error('Error:', error);
            progressText.textContent = 'Error during OCR. Please try again.';
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
            ocrOptions.classList.remove('d-none');
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

            // Update preview
            previewArea.innerHTML = '';
            previewArea.appendChild(canvas);
            pageInfo.textContent = `${currentPage} / ${totalPages}`;

        } catch (error) {
            console.error('Preview error:', error);
        }
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

    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
}); 