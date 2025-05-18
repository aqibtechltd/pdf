// Load pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const progressBar = document.getElementById('progressBar');
const progressBarInner = progressBar.querySelector('.progress-bar');
const convertBtn = document.getElementById('convertBtn');
const resultArea = document.getElementById('resultArea');
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
            showConvertButton();
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

function showConvertButton() {
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

async function startConversion() {
    try {
        // Show progress bar
        progressBar.classList.remove('d-none');
        convertBtn.disabled = true;

        // Load the PDF file
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        // Create a new Word document
        const doc = new docx.Document({
            sections: [{
                properties: {},
                children: []
            }]
        });
        
        // Process each page
        for (let i = 1; i <= pdf.numPages; i++) {
            // Update progress
            const progress = (i / pdf.numPages) * 100;
            progressBarInner.style.width = `${progress}%`;

            // Get the page
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Extract text and add to document
            const text = textContent.items.map(item => item.str).join(' ');
            doc.addSection({
                children: [
                    new docx.Paragraph({
                        children: [
                            new docx.TextRun({
                                text: text
                            })
                        ]
                    })
                ]
            });
        }

        // Add watermark
        addWatermark(doc);

        // Generate Word document
        const blob = await docx.Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);

        // Show download button
        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.href = url;
            link.download = selectedFile.name.replace('.pdf', '.docx');
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

// Add watermark to the document
function addWatermark(doc) {
    doc.addSection({
        children: [
            new docx.Paragraph({
                children: [
                    new docx.TextRun({
                        text: 'Created with PDFRocket.site',
                        size: 20,
                        color: '808080',
                        bold: true
                    })
                ],
                alignment: docx.AlignmentType.CENTER
            })
        ]
    });
}

// Reset the tool
function resetTool() {
    selectedFile = null;
    fileInput.value = '';
    convertBtn.classList.add('d-none');
    progressBar.classList.add('d-none');
    resultArea.classList.add('d-none');
    hideError();
    convertBtn.disabled = false;
} 