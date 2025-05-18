// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const compressionOptions = document.getElementById('compressionOptions');
const previewContainer = document.getElementById('previewContainer');
const progressBar = document.getElementById('progressBar');
const compressButton = document.getElementById('compressButton');
const downloadButton = document.getElementById('downloadButton');
const compressionLevel = document.getElementById('compressionLevel');
const imageQuality = document.getElementById('imageQuality');
const qualityValue = document.getElementById('qualityValue');

// State variables
let currentFile = null;
let compressedPdf = null;

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

imageQuality.addEventListener('input', (e) => {
    qualityValue.textContent = `${e.target.value}%`;
});

compressButton.addEventListener('click', compressPDF);

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
    updateFileInfo();
    showControls();
}

async function updateFileInfo() {
    const originalSize = formatFileSize(currentFile.size);
    document.getElementById('originalSize').textContent = originalSize;

    try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        document.getElementById('pageCount').textContent = pdf.numPages;
    } catch (error) {
        console.error('Error reading PDF:', error);
        alert('Error reading PDF file. Please try another file.');
    }
}

async function compressPDF() {
    if (!currentFile) return;

    try {
        progressBar.classList.remove('d-none');
        compressButton.disabled = true;
        updateProgress(10);

        const arrayBuffer = await currentFile.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        updateProgress(30);

        // Apply compression settings
        const quality = parseInt(imageQuality.value) / 100;
        const level = compressionLevel.value;

        // Compress images
        const pages = pdfDoc.getPages();
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const { width, height } = page.getSize();
            
            // Get all images on the page
            const images = await page.getImages();
            
            for (const image of images) {
                const embeddedImage = await pdfDoc.embedJpg(image);
                // Replace with compressed version
                await page.drawImage(embeddedImage, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height,
                    opacity: 1,
                });
            }
            
            updateProgress(30 + (i / pages.length) * 40);
        }

        // Apply compression based on selected level
        const compressOptions = {
            high: { compress: true, quality: 0.5 },
            medium: { compress: true, quality: 0.7 },
            low: { compress: true, quality: 0.9 }
        }[level];

        updateProgress(80);

        // Save the compressed PDF
        const compressedBytes = await pdfDoc.save(compressOptions);
        compressedPdf = new Blob([compressedBytes], { type: 'application/pdf' });

        // Update compression info
        const reduction = ((1 - (compressedPdf.size / currentFile.size)) * 100).toFixed(1);
        document.getElementById('estimatedSize').textContent = formatFileSize(compressedPdf.size);
        document.getElementById('reduction').textContent = `${reduction}%`;

        updateProgress(100);
        showDownloadButton();
    } catch (error) {
        console.error('Error compressing PDF:', error);
        alert('Error compressing PDF. Please try again.');
    } finally {
        compressButton.disabled = false;
    }
}

downloadButton.addEventListener('click', () => {
    if (!compressedPdf) return;
    
    const url = URL.createObjectURL(compressedPdf);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compressed_${currentFile.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

function showControls() {
    compressionOptions.classList.remove('d-none');
    previewContainer.classList.remove('d-none');
    compressButton.classList.remove('d-none');
    downloadButton.classList.add('d-none');
}

function showDownloadButton() {
    progressBar.classList.add('d-none');
    downloadButton.classList.remove('d-none');
}

function updateProgress(value) {
    const progressElement = progressBar.querySelector('.progress-bar');
    progressElement.style.width = `${value}%`;
    progressElement.setAttribute('aria-valuenow', value);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 