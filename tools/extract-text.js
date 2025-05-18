// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const extractionOptions = document.getElementById('extractionOptions');
const pageSelection = document.getElementById('pageSelection');
const pageRangeInput = document.getElementById('pageRangeInput');
const formatSelection = document.getElementById('formatSelection');
const includePageNumbers = document.getElementById('includePageNumbers');
const textPreview = document.getElementById('textPreview');
const progressBar = document.getElementById('progressBar');
const extractBtn = document.getElementById('extractBtn');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

// State variables
let currentFile = null;
let pdfDoc = null;
let currentPage = 1;
let totalPages = 1;
let extractedText = '';

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
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelection(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
    }
});

pageSelection.addEventListener('change', () => {
    pageRangeInput.classList.toggle('d-none', pageSelection.value !== 'range');
});

formatSelection.addEventListener('change', () => {
    textPreview.classList.toggle('formatted', formatSelection.value === 'formatted');
    updatePreview();
});

[prevPage, nextPage].forEach(button => {
    button.addEventListener('click', () => {
        if (button.id === 'prevPage' && currentPage > 1) {
            currentPage--;
        } else if (button.id === 'nextPage' && currentPage < totalPages) {
            currentPage++;
        }
        updatePreview();
    });
});

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
        extractionOptions.classList.remove('d-none');
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
        const textContent = await page.getTextContent();
        let text = '';

        if (formatSelection.value === 'plain') {
            text = textContent.items.map(item => item.str).join('\\n');
        } else {
            // Formatted text with layout preservation
            const viewport = page.getViewport({ scale: 1 });
            let lastY = null;
            let lineText = '';

            for (const item of textContent.items) {
                const [x, y] = item.transform.slice(4);
                const normalizedY = viewport.height - y;

                if (lastY !== null && Math.abs(normalizedY - lastY) > item.height) {
                    text += lineText + '\\n';
                    lineText = '';
                }

                lineText += item.str + ' ';
                lastY = normalizedY;
            }
            text += lineText;
        }

        if (includePageNumbers.checked) {
            text = `[Page ${currentPage}]\\n${text}`;
        }

        textPreview.textContent = text;
    } catch (error) {
        console.error('Error updating preview:', error);
        textPreview.textContent = 'Error loading page content.';
    }
}

extractBtn.addEventListener('click', async () => {
    if (!pdfDoc) return;

    try {
        progressBar.classList.remove('d-none');
        extractBtn.disabled = true;
        updateProgress(10);

        let pagesToProcess = [];
        if (pageSelection.value === 'all') {
            pagesToProcess = Array.from({ length: totalPages }, (_, i) => i + 1);
        } else if (pageSelection.value === 'current') {
            pagesToProcess = [currentPage];
        } else {
            const rangeText = pageRangeInput.querySelector('input').value;
            pagesToProcess = parsePageRange(rangeText, totalPages);
        }

        let fullText = '';
        for (let i = 0; i < pagesToProcess.length; i++) {
            const pageNum = pagesToProcess[i];
            const page = await pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();
            let pageText = '';

            if (formatSelection.value === 'plain') {
                pageText = textContent.items.map(item => item.str).join('\\n');
            } else {
                const viewport = page.getViewport({ scale: 1 });
                let lastY = null;
                let lineText = '';

                for (const item of textContent.items) {
                    const [x, y] = item.transform.slice(4);
                    const normalizedY = viewport.height - y;

                    if (lastY !== null && Math.abs(normalizedY - lastY) > item.height) {
                        pageText += lineText + '\\n';
                        lineText = '';
                    }

                    lineText += item.str + ' ';
                    lastY = normalizedY;
                }
                pageText += lineText;
            }

            if (includePageNumbers.checked) {
                pageText = `[Page ${pageNum}]\\n${pageText}`;
            }

            fullText += pageText + '\\n\\n';
            updateProgress(10 + (i / pagesToProcess.length) * 80);
        }

        extractedText = fullText.trim();
        textPreview.textContent = extractedText;

        // Create and trigger download
        const blob = new Blob([extractedText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `extracted_${currentFile.name.replace('.pdf', '.txt')}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        updateProgress(100);
        setTimeout(() => {
            progressBar.classList.add('d-none');
            extractBtn.disabled = false;
        }, 1000);
    } catch (error) {
        console.error('Error extracting text:', error);
        alert('Error extracting text. Please try again.');
        extractBtn.disabled = false;
        progressBar.classList.add('d-none');
    }
});

copyBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(textPreview.textContent);
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check me-2"></i>Copied!';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
    } catch (error) {
        console.error('Error copying text:', error);
        alert('Error copying text to clipboard.');
    }
});

clearBtn.addEventListener('click', () => {
    currentFile = null;
    pdfDoc = null;
    currentPage = 1;
    totalPages = 1;
    extractedText = '';
    extractionOptions.classList.add('d-none');
    fileInput.value = '';
    pageInfo.textContent = '1 / 1';
    textPreview.textContent = 'Select a PDF file to extract text...';
    progressBar.classList.add('d-none');
    pageSelection.value = 'all';
    pageRangeInput.classList.add('d-none');
    formatSelection.value = 'plain';
    textPreview.classList.remove('formatted');
    includePageNumbers.checked = true;
});

function parsePageRange(rangeText, maxPages) {
    const pages = new Set();
    const ranges = rangeText.split(',').map(r => r.trim());
    
    for (const range of ranges) {
        if (range.includes('-')) {
            const [start, end] = range.split('-').map(n => parseInt(n));
            for (let i = start; i <= end && i <= maxPages; i++) {
                if (i > 0) pages.add(i);
            }
        } else {
            const page = parseInt(range);
            if (page > 0 && page <= maxPages) {
                pages.add(page);
            }
        }
    }
    
    return Array.from(pages).sort((a, b) => a - b);
}

function updateProgress(value) {
    const progressElement = progressBar.querySelector('.progress-bar');
    progressElement.style.width = `${value}%`;
    progressElement.setAttribute('aria-valuenow', value);
} 