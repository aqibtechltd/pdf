// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const watermarkOptions = document.getElementById('watermarkOptions');
const watermarkType = document.getElementById('watermarkType');
const textOptions = document.getElementById('textOptions');
const imageOptions = document.getElementById('imageOptions');
const watermarkText = document.getElementById('watermarkText');
const fontSize = document.getElementById('fontSize');
const fontColor = document.getElementById('fontColor');
const imageInput = document.getElementById('imageInput');
const imageSize = document.getElementById('imageSize');
const imageSizeValue = document.getElementById('imageSizeValue');
const opacity = document.getElementById('opacity');
const opacityValue = document.getElementById('opacityValue');
const rotation = document.getElementById('rotation');
const rotationValue = document.getElementById('rotationValue');
const pageSelection = document.getElementById('pageSelection');
const pageRangeInput = document.getElementById('pageRangeInput');
const previewContainer = document.getElementById('previewContainer');
const pageCanvas = document.getElementById('pageCanvas');
const watermarkOverlay = document.getElementById('watermarkOverlay');
const progressBar = document.getElementById('progressBar');
const applyWatermark = document.getElementById('applyWatermark');
const clearBtn = document.getElementById('clearBtn');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

// State variables
let currentFile = null;
let currentPage = 1;
let totalPages = 1;
let pdfDoc = null;
let watermarkImage = null;
let currentPosition = 'center';

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

watermarkType.addEventListener('change', () => {
    textOptions.classList.toggle('d-none', watermarkType.value === 'image');
    imageOptions.classList.toggle('d-none', watermarkType.value === 'text');
    updatePreview();
});

// Input event listeners
[watermarkText, fontSize, fontColor].forEach(input => {
    input.addEventListener('input', updatePreview);
});

imageInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
        const file = e.target.files[0];
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }
        watermarkImage = await createImageBitmap(file);
        updatePreview();
    }
});

[imageSize, opacity, rotation].forEach(input => {
    input.addEventListener('input', (e) => {
        const value = e.target.value;
        const suffix = input.id === 'rotation' ? '°' : '%';
        document.getElementById(`${input.id}Value`).textContent = value + suffix;
        updatePreview();
    });
});

// Position buttons
document.querySelectorAll('[data-position]').forEach(button => {
    button.addEventListener('click', (e) => {
        document.querySelector('[data-position].active')?.classList.remove('active');
        button.classList.add('active');
        currentPosition = button.dataset.position;
        updatePreview();
    });
});

pageSelection.addEventListener('change', () => {
    pageRangeInput.classList.toggle('d-none', pageSelection.value !== 'range');
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
        watermarkOptions.classList.remove('d-none');
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
        const canvas = pageCanvas;
        const context = canvas.getContext('2d');

        // Scale to fit container width while maintaining aspect ratio
        const containerWidth = previewContainer.clientWidth;
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        previewContainer.style.height = `${scaledViewport.height}px`;

        await page.render({
            canvasContext: context,
            viewport: scaledViewport
        }).promise;

        // Update watermark preview
        updateWatermarkOverlay(scaledViewport);
    } catch (error) {
        console.error('Error updating preview:', error);
    }
}

function updateWatermarkOverlay(viewport) {
    const overlay = watermarkOverlay;
    overlay.style.width = `${viewport.width}px`;
    overlay.style.height = `${viewport.height}px`;

    if (watermarkType.value === 'text') {
        overlay.textContent = watermarkText.value;
        overlay.style.fontSize = `${fontSize.value * viewport.width / 1000}px`;
        overlay.style.color = fontColor.value;
    } else if (watermarkImage) {
        overlay.textContent = '';
        const img = document.createElement('img');
        img.src = URL.createObjectURL(imageInput.files[0]);
        img.style.width = `${imageSize.value}%`;
        overlay.appendChild(img);
    }

    overlay.style.opacity = opacity.value / 100;
    overlay.style.transform = `rotate(${rotation.value}deg)`;

    // Position watermark
    const positions = {
        'top-left': { top: '10%', left: '10%' },
        'top-center': { top: '10%', left: '50%', transform: 'translateX(-50%)' },
        'top-right': { top: '10%', right: '10%' },
        'middle-left': { top: '50%', left: '10%', transform: 'translateY(-50%)' },
        'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        'middle-right': { top: '50%', right: '10%', transform: 'translateY(-50%)' },
        'bottom-left': { bottom: '10%', left: '10%' },
        'bottom-center': { bottom: '10%', left: '50%', transform: 'translateX(-50%)' },
        'bottom-right': { bottom: '10%', right: '10%' }
    };

    const pos = positions[currentPosition];
    Object.assign(overlay.style, {
        top: pos.top || 'auto',
        left: pos.left || 'auto',
        right: pos.right || 'auto',
        bottom: pos.bottom || 'auto',
        transform: `${pos.transform || ''} rotate(${rotation.value}deg)`
    });
}

applyWatermark.addEventListener('click', async () => {
    if (!currentFile || !pdfDoc) return;

    try {
        progressBar.classList.remove('d-none');
        applyWatermark.disabled = true;
        updateProgress(10);

        const arrayBuffer = await currentFile.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        updateProgress(30);

        // Get pages to process
        let pagesToProcess = [];
        if (pageSelection.value === 'all') {
            pagesToProcess = Array.from({ length: pdfDoc.getPageCount() }, (_, i) => i);
        } else if (pageSelection.value === 'current') {
            pagesToProcess = [currentPage - 1];
        } else {
            const rangeText = pageRangeInput.querySelector('input').value;
            pagesToProcess = parsePageRange(rangeText, pdfDoc.getPageCount());
        }

        // Process each page
        for (let i = 0; i < pagesToProcess.length; i++) {
            const pageIndex = pagesToProcess[i];
            const page = pdfDoc.getPages()[pageIndex];
            const { width, height } = page.getSize();

            if (watermarkType.value === 'text') {
                page.drawText(watermarkText.value, {
                    x: width / 2,
                    y: height / 2,
                    size: parseInt(fontSize.value),
                    color: PDFLib.rgb(...hexToRgb(fontColor.value)),
                    opacity: opacity.value / 100,
                    rotate: PDFLib.degrees(parseInt(rotation.value)),
                    ...getPositionCoordinates(currentPosition, width, height)
                });
            } else if (watermarkImage) {
                const imageBytes = await fetch(URL.createObjectURL(imageInput.files[0])).then(res => res.arrayBuffer());
                const image = await pdfDoc.embedPng(imageBytes);
                const scaleFactor = parseInt(imageSize.value) / 100;
                const imgDims = image.scale(scaleFactor);

                page.drawImage(image, {
                    x: width / 2 - imgDims.width / 2,
                    y: height / 2 - imgDims.height / 2,
                    width: imgDims.width,
                    height: imgDims.height,
                    opacity: opacity.value / 100,
                    rotate: PDFLib.degrees(parseInt(rotation.value)),
                    ...getPositionCoordinates(currentPosition, width, height, imgDims)
                });
            }

            updateProgress(30 + (i / pagesToProcess.length) * 60);
        }

        updateProgress(90);

        // Save the PDF
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `watermarked_${currentFile.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        updateProgress(100);
        setTimeout(() => {
            progressBar.classList.add('d-none');
            applyWatermark.disabled = false;
        }, 1000);
    } catch (error) {
        console.error('Error applying watermark:', error);
        alert('Error applying watermark. Please try again.');
        applyWatermark.disabled = false;
        progressBar.classList.add('d-none');
    }
});

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

function getPositionCoordinates(position, pageWidth, pageHeight, imgDims = null) {
    const margin = 50; // pixels from edge
    const coords = {};

    if (position.includes('top')) {
        coords.y = pageHeight - margin;
    } else if (position.includes('bottom')) {
        coords.y = margin;
    } else {
        coords.y = pageHeight / 2;
    }

    if (position.includes('left')) {
        coords.x = margin;
    } else if (position.includes('right')) {
        coords.x = pageWidth - margin;
    } else {
        coords.x = pageWidth / 2;
    }

    if (imgDims) {
        if (position.includes('right')) {
            coords.x -= imgDims.width;
        } else if (!position.includes('left')) {
            coords.x -= imgDims.width / 2;
        }

        if (position.includes('top')) {
            coords.y -= imgDims.height;
        } else if (!position.includes('bottom')) {
            coords.y -= imgDims.height / 2;
        }
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

function updateProgress(value) {
    const progressElement = progressBar.querySelector('.progress-bar');
    progressElement.style.width = `${value}%`;
    progressElement.setAttribute('aria-valuenow', value);
}

clearBtn.addEventListener('click', () => {
    currentFile = null;
    pdfDoc = null;
    watermarkImage = null;
    currentPage = 1;
    totalPages = 1;
    watermarkOptions.classList.add('d-none');
    fileInput.value = '';
    imageInput.value = '';
    pageInfo.textContent = '1 / 1';
    watermarkType.value = 'text';
    watermarkText.value = 'CONFIDENTIAL';
    fontSize.value = '48';
    fontColor.value = '#FF0000';
    opacity.value = '30';
    rotation.value = '-45';
    imageSize.value = '50';
    pageSelection.value = 'all';
    pageRangeInput.classList.add('d-none');
    progressBar.classList.add('d-none');
}); 