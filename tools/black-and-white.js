document.addEventListener('DOMContentLoaded', function() {
    // Initialize PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    // DOM Elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const conversionOptions = document.getElementById('conversionOptions');
    const conversionMode = document.getElementById('conversionMode');
    const thresholdSection = document.getElementById('thresholdSection');
    const threshold = document.getElementById('threshold');
    const thresholdValue = document.getElementById('thresholdValue');
    const pageRange = document.getElementById('pageRange');
    const previewArea = document.getElementById('previewArea');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const convertBtn = document.getElementById('convertBtn');
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

    conversionMode.addEventListener('change', () => {
        thresholdSection.classList.toggle('d-none', conversionMode.value === 'grayscale');
        updatePreview();
    });

    threshold.addEventListener('input', (e) => {
        thresholdValue.textContent = e.target.value;
        updatePreview();
    });

    [pageRange].forEach(element => {
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
        conversionOptions.classList.add('d-none');
        previewArea.innerHTML = '';
    });

    convertBtn.addEventListener('click', async () => {
        if (!currentFile || !pdfDoc) return;

        try {
            progressArea.classList.remove('d-none');
            progressBar.style.width = '0%';
            progressText.textContent = 'Reading PDF file...';

            const arrayBuffer = await readFileAsArrayBuffer(currentFile);
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            
            // Parse page range
            const pages = pdfDoc.getPages();
            const pageNumbers = pageRange.value.trim() ? 
                parsePageRange(pageRange.value, pages.length) : 
                Array.from({length: pages.length}, (_, i) => i);

            // Process each page
            for (let i = 0; i < pageNumbers.length; i++) {
                const pageIndex = pageNumbers[i];
                const page = pages[pageIndex];
                
                // Get page dimensions
                const { width, height } = page.getSize();
                
                // Create a canvas to process the page
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = width;
                canvas.height = height;

                // Render PDF page to canvas
                const pdfPage = await pdfDoc.getPage(pageIndex + 1);
                const viewport = pdfPage.getViewport({ scale: 1 });
                await pdfPage.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                // Get image data
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = imageData.data;

                // Convert to black and white or grayscale
                if (conversionMode.value === 'bw') {
                    const thresh = parseInt(threshold.value);
                    for (let j = 0; j < pixels.length; j += 4) {
                        const avg = (pixels[j] + pixels[j + 1] + pixels[j + 2]) / 3;
                        const val = avg > thresh ? 255 : 0;
                        pixels[j] = pixels[j + 1] = pixels[j + 2] = val;
                    }
                } else {
                    for (let j = 0; j < pixels.length; j += 4) {
                        const avg = (pixels[j] + pixels[j + 1] + pixels[j + 2]) / 3;
                        pixels[j] = pixels[j + 1] = pixels[j + 2] = avg;
                    }
                }

                // Put processed image data back
                context.putImageData(imageData, 0, 0);

                // Replace page content with processed image
                const processedImage = await pdfDoc.embedPng(canvas.toDataURL('image/png'));
                page.drawImage(processedImage, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height
                });

                // Update progress
                const progress = ((i + 1) / pageNumbers.length) * 80;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `Processing page ${i + 1} of ${pageNumbers.length}...`;
            }

            progressBar.style.width = '90%';
            progressText.textContent = 'Creating download file...';

            // Add watermark
            const helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            pdfDoc.getPages().forEach(page => {
                page.drawText('Created with PDFRocket.site by Aqib Chaudhary', {
                    x: 10,
                    y: 10,
                    size: 8,
                    font: helveticaFont,
                    color: PDFLib.rgb(0.6, 0.6, 0.6),
                });
            });

            // Save the PDF
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = currentFile.name.replace('.pdf', '_bw.pdf');
            link.click();

            // Clean up
            URL.revokeObjectURL(url);
            progressText.textContent = 'Conversion complete!';
            progressBar.style.width = '100%';
            
            setTimeout(() => {
                progressArea.classList.add('d-none');
            }, 2000);

        } catch (error) {
            console.error('Error:', error);
            progressText.textContent = 'Error during conversion. Please try again.';
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
            conversionOptions.classList.remove('d-none');
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

            // Apply black and white effect to preview
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;

            if (conversionMode.value === 'bw') {
                const thresh = parseInt(threshold.value);
                for (let i = 0; i < pixels.length; i += 4) {
                    const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
                    const val = avg > thresh ? 255 : 0;
                    pixels[i] = pixels[i + 1] = pixels[i + 2] = val;
                }
            } else {
                for (let i = 0; i < pixels.length; i += 4) {
                    const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
                    pixels[i] = pixels[i + 1] = pixels[i + 2] = avg;
                }
            }

            context.putImageData(imageData, 0, 0);

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