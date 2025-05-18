// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const optionsArea = document.getElementById('optionsArea');
const progressBar = document.getElementById('progressBar');
const progressBarInner = progressBar.querySelector('.progress-bar');
const convertBtn = document.getElementById('convertBtn');
const resultArea = document.getElementById('resultArea');
const previewArea = document.getElementById('previewArea');
const presentation = document.getElementById('presentation');
const downloadBtn = document.getElementById('downloadBtn');
const errorArea = document.getElementById('errorArea');
const errorMessage = document.getElementById('errorMessage');

let selectedFile = null;

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

function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        if (validateFile(file)) {
            selectedFile = file;
            showOptions();
            showPreview(file);
        }
    }
}

function validateFile(file) {
    // Check file type
    const validTypes = [
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    if (!validTypes.includes(file.type) && 
        !file.name.endsWith('.ppt') && 
        !file.name.endsWith('.pptx')) {
        showError('Please select a valid PowerPoint file (.ppt or .pptx).');
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

async function showPreview(file) {
    previewArea.classList.remove('d-none');
    
    // Clear previous preview
    presentation.innerHTML = '';
    
    // Create preview container
    const previewContainer = document.createElement('div');
    previewContainer.id = 'previewContainer';
    presentation.appendChild(previewContainer);

    try {
        // Initialize PPTXjs
        const pptxjs = new PPTXjs(previewContainer);
        
        // Load and render the presentation
        await pptxjs.loadFile(file);
        await pptxjs.render();
        
    } catch (error) {
        console.error('Preview error:', error);
        showError('Error generating preview. The conversion may still work.');
    }
}

async function startConversion() {
    try {
        progressBar.classList.remove('d-none');
        convertBtn.disabled = true;
        resultArea.classList.add('d-none');

        const pageSize = document.getElementById('pageSize').value;
        const orientation = document.getElementById('orientation').value;

        // Initialize jsPDF
        const pdf = new jspdf.jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: pageSize
        });

        // Get slides from preview
        const slides = document.querySelectorAll('#previewContainer .slide');
        const totalSlides = slides.length;

        // Convert each slide to image and add to PDF
        for (let i = 0; i < totalSlides; i++) {
            // Update progress
            const progress = ((i + 1) / totalSlides) * 100;
            progressBarInner.style.width = `${progress}%`;

            // Convert slide to image
            const canvas = await html2canvas(slides[i], {
                scale: 2, // Higher quality
                backgroundColor: '#ffffff'
            });

            // Add image to PDF
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            if (i > 0) pdf.addPage();
            
            // Calculate dimensions to fit the page
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgRatio = canvas.width / canvas.height;
            const pageRatio = pageWidth / pageHeight;
            
            let imgWidth = pageWidth;
            let imgHeight = imgWidth / imgRatio;
            
            if (imgHeight > pageHeight) {
                imgHeight = pageHeight;
                imgWidth = imgHeight * imgRatio;
            }
            
            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;
            
            pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
        }

        // Add watermark
        addWatermark(pdf);

        // Generate PDF
        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);

        // Setup download button
        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.href = url;
            link.download = selectedFile.name.replace(/\.(ppt|pptx)$/, '.pdf');
            link.click();
        };

        // Show success message
        progressBar.classList.add('d-none');
        resultArea.classList.remove('d-none');

    } catch (error) {
        console.error('Conversion error:', error);
        showError('An error occurred during conversion. Please try again.');
        progressBar.classList.add('d-none');
        convertBtn.disabled = false;
    }
}

// Add watermark to the PDF
function addWatermark(pdf) {
    const totalPages = pdf.internal.getNumberOfPages();
    const watermark = 'Created with PDFRocket.site';
    
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(128, 128, 128);
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        pdf.text(watermark, pageWidth / 2, pageHeight - 10, {
            align: 'center'
        });
    }
}

// Reset the tool
function resetTool() {
    selectedFile = null;
    fileInput.value = '';
    optionsArea.classList.add('d-none');
    convertBtn.classList.add('d-none');
    progressBar.classList.add('d-none');
    resultArea.classList.add('d-none');
    previewArea.classList.add('d-none');
    presentation.innerHTML = '';
    hideError();
    convertBtn.disabled = false;
} 