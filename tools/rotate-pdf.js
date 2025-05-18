document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const pdfPreview = document.getElementById('pdfPreview');
    const pagePreviewContainer = document.getElementById('pagePreviewContainer');
    const saveBtn = document.getElementById('saveBtn');
    const clearBtn = document.getElementById('clearBtn');
    const progressArea = document.getElementById('progressArea');
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.getElementById('progressText');
    const rotateAllLeft = document.getElementById('rotateAllLeft');
    const rotateAllRight = document.getElementById('rotateAllRight');

    let currentPdfFile = null;
    let pdfDocument = null;
    let totalPages = 0;
    let pageRotations = new Map(); // Stores rotation degrees for each page

    // Initialize PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-primary');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-primary');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary');
        handleFile(e.dataTransfer.files[0]);
    });

    // File input handler
    fileInput.addEventListener('change', (e) => {
        handleFile(e.target.files[0]);
    });

    // Clear button handler
    clearBtn.addEventListener('click', () => {
        currentPdfFile = null;
        pdfDocument = null;
        totalPages = 0;
        pageRotations.clear();
        pdfPreview.classList.add('d-none');
        pagePreviewContainer.innerHTML = '';
        fileInput.value = '';
    });

    // Rotate all pages left
    rotateAllLeft.addEventListener('click', () => {
        if (!currentPdfFile) return;
        for (let i = 1; i <= totalPages; i++) {
            const currentRotation = pageRotations.get(i) || 0;
            pageRotations.set(i, (currentRotation - 90) % 360);
        }
        updatePreviews();
    });

    // Rotate all pages right
    rotateAllRight.addEventListener('click', () => {
        if (!currentPdfFile) return;
        for (let i = 1; i <= totalPages; i++) {
            const currentRotation = pageRotations.get(i) || 0;
            pageRotations.set(i, (currentRotation + 90) % 360);
        }
        updatePreviews();
    });

    // Save button handler
    saveBtn.addEventListener('click', async () => {
        if (!currentPdfFile) {
            alert('Please select a PDF file first.');
            return;
        }

        try {
            progressArea.classList.remove('d-none');
            progressBar.style.width = '0%';
            progressText.textContent = 'Reading PDF file...';

            const arrayBuffer = await readFileAsArrayBuffer(currentPdfFile);
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            
            // Apply rotations
            const pages = pdfDoc.getPages();
            for (let i = 0; i < pages.length; i++) {
                const rotation = pageRotations.get(i + 1) || 0;
                if (rotation !== 0) {
                    const page = pages[i];
                    page.setRotation(PDFLib.degrees(rotation));
                }
                
                // Update progress
                const progress = (i + 1) / pages.length * 80;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `Rotating page ${i + 1} of ${pages.length}...`;
            }

            progressBar.style.width = '90%';
            progressText.textContent = 'Adding watermark...';

            // Add watermark to each page
            const helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            pages.forEach(page => {
                page.drawText('Created with PDFRocket.site by Aqib Chaudhary', {
                    x: 10,
                    y: 10,
                    size: 8,
                    font: helveticaFont,
                    color: PDFLib.rgb(0.6, 0.6, 0.6),
                });
            });

            // Save and download
            progressBar.style.width = '95%';
            progressText.textContent = 'Creating download file...';
            
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'rotated.pdf';
            link.click();

            // Clean up
            URL.revokeObjectURL(url);
            progressText.textContent = 'Rotation complete!';
            progressBar.style.width = '100%';
            
            setTimeout(() => {
                progressArea.classList.add('d-none');
            }, 2000);

        } catch (error) {
            console.error('Rotation error:', error);
            progressText.textContent = 'Error during rotation. Please try again.';
            progressBar.classList.add('bg-danger');
        }
    });

    // Helper functions
    async function handleFile(file) {
        if (!file) return;
        
        if (!file.type.match('application/pdf')) {
            alert('Please select a PDF file.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('File size exceeds 10MB limit.');
            return;
        }

        currentPdfFile = file;
        pageRotations.clear();
        
        try {
            // Load the PDF for preview
            const arrayBuffer = await readFileAsArrayBuffer(file);
            pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            totalPages = pdfDocument.numPages;

            // Show preview area
            pdfPreview.classList.remove('d-none');
            
            // Generate previews
            await updatePreviews();

        } catch (error) {
            console.error('Preview error:', error);
            alert('Error loading PDF file. Please try again.');
        }
    }

    async function updatePreviews() {
        // Clear existing previews
        pagePreviewContainer.innerHTML = '';

        // Generate previews for all pages
        for (let i = 1; i <= totalPages; i++) {
            const page = await pdfDocument.getPage(i);
            const rotation = pageRotations.get(i) || 0;
            
            // Create preview container
            const col = document.createElement('div');
            col.className = 'col-md-4 col-sm-6 mb-3';
            
            // Create canvas for preview
            const viewport = page.getViewport({ scale: 0.3, rotation: rotation });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            const context = canvas.getContext('2d');
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            // Create rotation controls
            col.innerHTML = `
                <div class="card">
                    <div class="card-body p-2">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <p class="mb-0">Page ${i}</p>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary rotate-left" data-page="${i}">
                                    <i class="fas fa-undo"></i>
                                </button>
                                <button class="btn btn-outline-primary rotate-right" data-page="${i}">
                                    <i class="fas fa-redo"></i>
                                </button>
                            </div>
                        </div>
                        ${canvas.outerHTML}
                    </div>
                </div>
            `;
            
            pagePreviewContainer.appendChild(col);

            // Add rotation button handlers
            const rotateLeftBtn = col.querySelector('.rotate-left');
            const rotateRightBtn = col.querySelector('.rotate-right');

            rotateLeftBtn.addEventListener('click', () => {
                const currentRotation = pageRotations.get(i) || 0;
                pageRotations.set(i, (currentRotation - 90) % 360);
                updatePreviews();
            });

            rotateRightBtn.addEventListener('click', () => {
                const currentRotation = pageRotations.get(i) || 0;
                pageRotations.set(i, (currentRotation + 90) % 360);
                updatePreviews();
            });
        }
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