document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const selectedFiles = document.getElementById('selectedFiles');
    const mergeBtn = document.getElementById('mergeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const progressArea = document.getElementById('progressArea');
    const progressBar = progressArea.querySelector('.progress-bar');
    const progressText = document.getElementById('progressText');

    // State
    let pdfFiles = [];

    // Initialize Sortable
    new Sortable(selectedFiles, {
        animation: 150,
        ghostClass: 'sortable-ghost'
    });

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
        handleFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
    });

    clearBtn.addEventListener('click', () => {
        pdfFiles = [];
        selectedFiles.innerHTML = '';
        fileList.classList.add('d-none');
        fileInput.value = '';
    });

    mergeBtn.addEventListener('click', async () => {
        if (pdfFiles.length < 2) {
            alert('Please select at least 2 PDF files to merge.');
            return;
        }

        try {
            progressArea.classList.remove('d-none');
            progressBar.style.width = '0%';
            progressText.textContent = 'Reading PDF files...';

            // Create a new PDF document
            const mergedPdf = await PDFLib.PDFDocument.create();
            
            // Process each PDF file
            for (let i = 0; i < pdfFiles.length; i++) {
                const file = pdfFiles[i];
                const progress = (i / pdfFiles.length) * 80;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `Processing ${file.name}...`;

                // Read the PDF file
                const arrayBuffer = await readFileAsArrayBuffer(file);
                const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
                
                // Copy all pages
                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
            }

            progressBar.style.width = '90%';
            progressText.textContent = 'Adding watermark...';

            // Add watermark to each page
            const helveticaFont = await mergedPdf.embedFont(PDFLib.StandardFonts.Helvetica);
            mergedPdf.getPages().forEach(page => {
                page.drawText('Created with PDFRocket.site by Aqib Chaudhary', {
                    x: 10,
                    y: 10,
                    size: 8,
                    font: helveticaFont,
                    color: PDFLib.rgb(0.6, 0.6, 0.6),
                });
            });

            // Save the merged PDF
            progressBar.style.width = '95%';
            progressText.textContent = 'Creating download file...';
            
            const mergedPdfBytes = await mergedPdf.save();
            const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'merged.pdf';
            link.click();

            // Clean up
            URL.revokeObjectURL(url);
            progressText.textContent = 'Merge complete!';
            progressBar.style.width = '100%';
            
            setTimeout(() => {
                progressArea.classList.add('d-none');
            }, 2000);

        } catch (error) {
            console.error('Merge error:', error);
            progressText.textContent = 'Error during merge. Please try again.';
            progressBar.classList.add('bg-danger');
        }
    });

    // Helper Functions
    function handleFiles(files) {
        const validFiles = files.filter(file => {
            if (!file.type.match('application/pdf')) {
                alert(`${file.name} is not a PDF file.`);
                return false;
            }
            if (file.size > 10 * 1024 * 1024) {
                alert(`${file.name} exceeds 10MB size limit.`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        // Add new files to the list
        pdfFiles.push(...validFiles);
        
        // Update UI
        updateFileList();
    }

    function updateFileList() {
        selectedFiles.innerHTML = pdfFiles.map((file, index) => `
            <li class="list-group-item d-flex justify-content-between align-items-center" data-index="${index}">
                <span><i class="fas fa-file-pdf text-danger me-2"></i>${file.name}</span>
                <button class="btn btn-sm btn-danger" onclick="removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </li>
        `).join('');

        fileList.classList.remove('d-none');
    }

    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // Expose removeFile to global scope
    window.removeFile = function(index) {
        pdfFiles.splice(index, 1);
        if (pdfFiles.length === 0) {
            fileList.classList.add('d-none');
        } else {
            updateFileList();
        }
    };
}); 