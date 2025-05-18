// Load pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const optionsArea = document.getElementById('optionsArea');
const progressBar = document.getElementById('progressBar');
const progressBarInner = progressBar.querySelector('.progress-bar');
const convertBtn = document.getElementById('convertBtn');
const resultArea = document.getElementById('resultArea');
const previewArea = document.getElementById('previewArea');
const downloadBtn = document.getElementById('downloadBtn');
const errorArea = document.getElementById('errorArea');
const errorMessage = document.getElementById('errorMessage');
const pageRangeSelect = document.getElementById('pageRange');
const customRangeInput = document.getElementById('customRangeInput');
const customRange = document.getElementById('customRange');

let selectedFile = null;
let convertedImages = [];

// Drag and drop handlers
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
    dropZone.classList.add('border', 'border-primary');
}

function unhighlight(e) {
    dropZone.classList.remove('border', 'border-primary');
}

// Handle dropped files
dropZone.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

// Handle file input change
fileInput.addEventListener('change', function(e) {
    handleFiles(this.files);
});

// Handle page range selection
pageRangeSelect.addEventListener('change', function(e) {
    if (this.value === 'custom') {
        customRangeInput.classList.remove('d-none');
    } else {
        customRangeInput.classList.add('d-none');
    }
});

function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        if (validateFile(file)) {
            selectedFile = file;
            showOptions();
        }
    }
}

function validateFile(file) {
    // Check file type
    if (!file.type.match('application/pdf')) {
        showError('Please select a valid PDF file.');
        return false;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
        showError('File size exceeds 10MB limit.');
        return false;
    }

    hideError();
    return true;
}

function showOptions() {
    optionsArea.classList.remove('d-none');
    convertBtn.classList.remove('d-none');
    convertBtn.addEventListener('click', startConversion);
}

function showError(message) {
    errorMessage.textContent = message;
    errorArea.classList.remove('d-none');
}

function hideError() {
    errorArea.classList.add('d-none');
}

function parsePageRange(totalPages) {
    if (pageRangeSelect.value === 'all') {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const rangeStr = customRange.value.trim();
    const pages = new Set();

    rangeStr.split(',').forEach(part => {
        part = part.trim();
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(num => parseInt(num));
            for (let i = start; i <= end; i++) {
                if (i > 0 && i <= totalPages) pages.add(i);
            }
        } else {
            const pageNum = parseInt(part);
            if (pageNum > 0 && pageNum <= totalPages) pages.add(pageNum);
        }
    });

    return Array.from(pages).sort((a, b) => a - b);
}

async function startConversion() {
    try {
        convertedImages = [];
        previewArea.innerHTML = '';
        progressBar.classList.remove('d-none');
        convertBtn.disabled = true;
        resultArea.classList.add('d-none');

        const quality = parseFloat(document.getElementById('imageQuality').value);
        const scale = quality * 2; // Adjust scale based on quality

        // Load the PDF file
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        // Get pages to convert
        const pagesToConvert = parsePageRange(pdf.numPages);
        
        // Process each selected page
        for (let i = 0; i < pagesToConvert.length; i++) {
            const pageNumber = pagesToConvert[i];
            
            // Update progress
            const progress = ((i + 1) / pagesToConvert.length) * 100;
            progressBarInner.style.width = `${progress}%`;

            // Get the page
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale });

            // Create canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // Render PDF page to canvas
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            // Convert canvas to image
            const imageUrl = canvas.toDataURL('image/jpeg', quality);
            convertedImages.push({
                url: imageUrl,
                name: `page-${pageNumber}.jpg`
            });

            // Add preview
            const previewCard = document.createElement('div');
            previewCard.className = 'card mb-3';
            previewCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Page ${pageNumber}</h5>
                    <img src="${imageUrl}" class="img-fluid mb-2" alt="Page ${pageNumber}">
                    <a href="${imageUrl}" download="page-${pageNumber}.jpg" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-download me-1"></i>Download
                    </a>
                </div>
            `;
            previewArea.appendChild(previewCard);
        }

        // Show download all button
        progressBar.classList.add('d-none');
        resultArea.classList.remove('d-none');
        
        // Setup download all functionality
        downloadBtn.onclick = async () => {
            const zip = new JSZip();
            convertedImages.forEach(image => {
                // Convert base64 to blob
                const imageData = image.url.split(',')[1];
                zip.file(image.name, imageData, { base64: true });
            });
            
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'pdf-images.zip';
            link.click();
        };

    } catch (error) {
        console.error('Conversion error:', error);
        showError('An error occurred during conversion. Please try again.');
        progressBar.classList.add('d-none');
        convertBtn.disabled = false;
    }
}

// Reset the tool
function resetTool() {
    selectedFile = null;
    convertedImages = [];
    fileInput.value = '';
    optionsArea.classList.add('d-none');
    convertBtn.classList.add('d-none');
    progressBar.classList.add('d-none');
    resultArea.classList.add('d-none');
    previewArea.innerHTML = '';
    hideError();
    convertBtn.disabled = false;
    pageRangeSelect.value = 'all';
    customRangeInput.classList.add('d-none');
} 