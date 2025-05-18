document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const selectedFiles = document.getElementById('selectedFiles');
    const convertFileBtn = document.getElementById('convertFileBtn');
    const convertUrlBtn = document.getElementById('convertUrlBtn');
    const clearFileBtn = document.getElementById('clearFileBtn');
    const urlInput = document.getElementById('urlInput');
    const progressArea = document.getElementById('progressArea');
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.getElementById('progressText');
    const previewArea = document.getElementById('previewArea');
    const pdfPreview = document.getElementById('pdfPreview');

    let currentFile = null;
    let currentHtml = null;

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
        handleFiles(e.dataTransfer.files);
    });

    // File input handler
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Clear button handler
    clearFileBtn.addEventListener('click', () => {
        currentFile = null;
        currentHtml = null;
        updateFileList();
        fileList.classList.add('d-none');
        previewArea.classList.add('d-none');
    });

    // Convert file button handler
    convertFileBtn.addEventListener('click', async () => {
        if (!currentFile) {
            alert('Please select an HTML file.');
            return;
        }

        try {
            progressArea.classList.remove('d-none');
            previewArea.classList.add('d-none');
            progressBar.style.width = '0%';
            progressText.textContent = 'Reading HTML file...';

            // Read HTML file
            currentHtml = await readFileAsText(currentFile);
            await convertHtmlToPdf(currentHtml, currentFile.name);

        } catch (error) {
            console.error('Conversion error:', error);
            progressText.textContent = 'Error during conversion. Please try again.';
            progressBar.classList.add('bg-danger');
        }
    });

    // Convert URL button handler
    convertUrlBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        
        if (!url) {
            alert('Please enter a valid URL.');
            return;
        }

        if (!url.match(/^https?:\/\/.+/)) {
            alert('Please enter a complete URL including http:// or https://');
            return;
        }

        try {
            progressArea.classList.remove('d-none');
            previewArea.classList.add('d-none');
            progressBar.style.width = '0%';
            progressText.textContent = 'Fetching web page...';

            // Fetch URL content
            const response = await fetch(url);
            const html = await response.text();
            
            await convertHtmlToPdf(html, 'webpage.pdf');

        } catch (error) {
            console.error('Conversion error:', error);
            progressText.textContent = 'Error during conversion. Please try again.';
            progressBar.classList.add('bg-danger');
        }
    });

    // Convert HTML to PDF
    async function convertHtmlToPdf(html, filename) {
        try {
            progressBar.style.width = '20%';
            progressText.textContent = 'Processing HTML...';

            // Create temporary container with proper styling
            const container = document.createElement('div');
            container.innerHTML = html;
            container.style.width = '210mm'; // A4 width
            document.body.appendChild(container);

            // Get page size dimensions
            const pageSize = document.getElementById('pageSize').value;
            const orientation = document.getElementById('orientation').value;
            const margin = parseInt(document.getElementById('margin').value);
            
            const pageDimensions = getPageDimensions(pageSize, orientation);

            // Calculate number of pages based on content height
            const contentHeight = container.offsetHeight;
            const pageHeight = pageDimensions.height - (margin * 2);
            const totalPages = Math.ceil(contentHeight / pageHeight);

            progressBar.style.width = '40%';
            progressText.textContent = 'Converting pages...';

            // Create PDF document
            const pdf = new jsPDF({
                orientation: orientation,
                unit: 'mm',
                format: pageSize
            });

            // Add header and footer if enabled
            const addHeaderFooter = true;
            if (addHeaderFooter) {
                pdf.setFontSize(10);
                pdf.setTextColor(100);
            }

            // Convert each page
            for (let i = 0; i < totalPages; i++) {
                if (i > 0) pdf.addPage();

                // Set clip for current page
                const yOffset = i * pageHeight;
                container.style.transform = `translateY(-${yOffset}px)`;

                // Convert page to canvas
                const canvas = await html2canvas(container, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    windowWidth: pageDimensions.width,
                    windowHeight: pageDimensions.height,
                    x: 0,
                    y: yOffset,
                    scrollY: -yOffset,
                    height: Math.min(pageHeight, contentHeight - yOffset)
                });

                // Add page content
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                pdf.addImage(imgData, 'JPEG', margin, margin, 
                    pageDimensions.width - (margin * 2), 
                    Math.min(pageHeight, contentHeight - yOffset));

                // Add header
                if (addHeaderFooter) {
                    pdf.setFontSize(10);
                    pdf.text(`PDFRocket.site - ${filename}`, margin, 5);
                }

                // Add footer
                if (addHeaderFooter) {
                    pdf.setFontSize(8);
                    pdf.text(`Page ${i + 1} of ${totalPages}`, margin, pageDimensions.height - 5);
                    pdf.text('Created with PDFRocket.site by Aqib Chaudhary', 
                        pageDimensions.width - margin - 60, 
                        pageDimensions.height - 5);
                }

                progressBar.style.width = `${40 + (50 * (i + 1) / totalPages)}%`;
                progressText.textContent = `Converting page ${i + 1} of ${totalPages}...`;
            }

            // Remove temporary container
            document.body.removeChild(container);

            // Save PDF
            progressBar.style.width = '90%';
            progressText.textContent = 'Saving PDF...';

            pdf.save(filename.replace(/\.(html|htm)$/, '.pdf'));

            // Show preview
            const pdfDataUri = pdf.output('datauristring');
            pdfPreview.innerHTML = `
                <embed src="${pdfDataUri}" type="application/pdf" width="100%" height="600px">
            `;

            previewArea.classList.remove('d-none');
            progressText.textContent = 'Conversion complete!';
            progressBar.style.width = '100%';
            
            setTimeout(() => {
                progressArea.classList.add('d-none');
            }, 2000);

        } catch (error) {
            throw error;
        }
    }

    function getPageDimensions(size, orientation) {
        const sizes = {
            'A4': { width: 210, height: 297 },
            'letter': { width: 216, height: 279 },
            'legal': { width: 216, height: 356 }
        };

        const dims = sizes[size];
        return orientation === 'landscape' 
            ? { width: dims.height, height: dims.width }
            : dims;
    }

    // Helper functions
    function handleFiles(fileList) {
        const file = fileList[0];
        
        if (!file) return;

        if (!file.type.match('text/html') && !file.name.match(/\.(html|htm)$/i)) {
            alert('Please select an HTML file.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('File size must not exceed 10MB.');
            return;
        }

        currentFile = file;
        currentHtml = null;
        updateFileList();
        previewArea.classList.add('d-none');
    }

    function updateFileList() {
        if (currentFile) {
            fileList.classList.remove('d-none');
            selectedFiles.innerHTML = `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${currentFile.name}
                    <button class="btn btn-sm btn-danger" onclick="removeFile()">Remove</button>
                </li>
            `;
        } else {
            fileList.classList.add('d-none');
        }
    }

    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // Expose removeFile to global scope
    window.removeFile = function() {
        currentFile = null;
        currentHtml = null;
        updateFileList();
        previewArea.classList.add('d-none');
    };
}); 