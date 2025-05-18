document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const pdfPreview = document.getElementById('pdfPreview');
    const pagePreviewContainer = document.getElementById('pagePreviewContainer');
    const splitBtn = document.getElementById('splitBtn');
    const clearBtn = document.getElementById('clearBtn');
    const progressArea = document.getElementById('progressArea');
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.getElementById('progressText');
    const extractPagesOption = document.getElementById('extractPagesOption');
    const splitByNumberOption = document.getElementById('splitByNumberOption');
    const pageRangeInput = document.getElementById('pageRangeInput');
    const splitNumberInput = document.getElementById('splitNumberInput');

    let currentPdfFile = null;
    let pdfDocument = null;
    let totalPages = 0;

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
        pdfPreview.classList.add('d-none');
        pagePreviewContainer.innerHTML = '';
        fileInput.value = '';
    });

    // Split method change handler
    document.querySelectorAll('input[name="splitMethod"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            extractPagesOption.classList.add('d-none');
            splitByNumberOption.classList.add('d-none');

            if (e.target.value === 'extract') {
                extractPagesOption.classList.remove('d-none');
            } else if (e.target.value === 'number') {
                splitByNumberOption.classList.remove('d-none');
            }
        });
    });

    // Split button handler
    splitBtn.addEventListener('click', async () => {
        if (!currentPdfFile) {
            alert('Please select a PDF file first.');
            return;
        }

        try {
            progressArea.classList.remove('d-none');
            progressBar.style.width = '0%';
            progressText.textContent = 'Reading PDF file...';

            const splitMethod = document.querySelector('input[name="splitMethod"]:checked').value;
            const pageRanges = [];

            if (splitMethod === 'extract') {
                const ranges = parsePageRanges(pageRangeInput.value, totalPages);
                if (!ranges) {
                    alert('Please enter valid page ranges.');
                    progressArea.classList.add('d-none');
                    return;
                }
                pageRanges.push(...ranges);
            } else if (splitMethod === 'number') {
                const n = parseInt(splitNumberInput.value);
                if (n < 1) {
                    alert('Please enter a valid number of pages.');
                    progressArea.classList.add('d-none');
                    return;
                }
                for (let i = 1; i <= totalPages; i += n) {
                    pageRanges.push([i, Math.min(i + n - 1, totalPages)]);
                }
            } else {
                // Split by range - create individual PDFs for each page
                for (let i = 1; i <= totalPages; i++) {
                    pageRanges.push([i, i]);
                }
            }

            const arrayBuffer = await readFileAsArrayBuffer(currentPdfFile);
            const sourcePdf = await PDFLib.PDFDocument.load(arrayBuffer);
            
            // Create a ZIP file to store multiple PDFs
            const zip = new JSZip();
            
            // Process each range
            for (let i = 0; i < pageRanges.length; i++) {
                const [start, end] = pageRanges[i];
                
                // Create new PDF document
                const newPdf = await PDFLib.PDFDocument.create();
                
                // Copy pages from source PDF
                const pages = await newPdf.copyPages(sourcePdf, Array.from(
                    { length: end - start + 1 }, 
                    (_, i) => start - 1 + i
                ));
                
                pages.forEach(page => newPdf.addPage(page));

                // Add watermark
                const helveticaFont = await newPdf.embedFont(PDFLib.StandardFonts.Helvetica);
                newPdf.getPages().forEach(page => {
                    page.drawText('Created with PDFRocket.site by Aqib Chaudhary', {
                        x: 10,
                        y: 10,
                        size: 8,
                        font: helveticaFont,
                        color: PDFLib.rgb(0.6, 0.6, 0.6),
                    });
                });

                // Save PDF
                const pdfBytes = await newPdf.save();
                
                // Add to ZIP
                zip.file(`split_${start}-${end}.pdf`, pdfBytes);

                // Update progress
                const progress = (i + 1) / pageRanges.length * 90;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `Processing split ${i + 1} of ${pageRanges.length}...`;
            }

            // Generate and download ZIP file
            progressBar.style.width = '95%';
            progressText.textContent = 'Creating download file...';
            
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'split_pdfs.zip';
            link.click();

            // Clean up
            URL.revokeObjectURL(url);
            progressText.textContent = 'Split complete!';
            progressBar.style.width = '100%';
            
            setTimeout(() => {
                progressArea.classList.add('d-none');
            }, 2000);

        } catch (error) {
            console.error('Split error:', error);
            progressText.textContent = 'Error during split. Please try again.';
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
        
        try {
            // Load the PDF for preview
            const arrayBuffer = await readFileAsArrayBuffer(file);
            pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            totalPages = pdfDocument.numPages;

            // Show preview area
            pdfPreview.classList.remove('d-none');
            
            // Clear existing previews
            pagePreviewContainer.innerHTML = '';

            // Generate previews for first few pages
            const previewPages = Math.min(totalPages, 5);
            for (let i = 1; i <= previewPages; i++) {
                const page = await pdfDocument.getPage(i);
                const viewport = page.getViewport({ scale: 0.3 });
                
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                const context = canvas.getContext('2d');
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                const col = document.createElement('div');
                col.className = 'col-md-4 col-sm-6 mb-3';
                col.innerHTML = `
                    <div class="card">
                        <div class="card-body p-2">
                            <p class="text-center mb-1">Page ${i}</p>
                            ${canvas.outerHTML}
                        </div>
                    </div>
                `;
                
                pagePreviewContainer.appendChild(col);
            }

            if (totalPages > previewPages) {
                const morePages = document.createElement('div');
                morePages.className = 'col-12 text-center mt-2';
                morePages.innerHTML = `<p>+ ${totalPages - previewPages} more pages</p>`;
                pagePreviewContainer.appendChild(morePages);
            }

        } catch (error) {
            console.error('Preview error:', error);
            alert('Error loading PDF file. Please try again.');
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

    function parsePageRanges(input, maxPages) {
        if (!input.trim()) return null;
        
        const ranges = [];
        const parts = input.split(',').map(part => part.trim());
        
        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(num => parseInt(num.trim()));
                if (isNaN(start) || isNaN(end) || start < 1 || end > maxPages || start > end) {
                    return null;
                }
                ranges.push([start, end]);
            } else {
                const page = parseInt(part);
                if (isNaN(page) || page < 1 || page > maxPages) {
                    return null;
                }
                ranges.push([page, page]);
            }
        }
        
        return ranges;
    }
}); 