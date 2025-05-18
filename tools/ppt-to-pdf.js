document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const selectedFiles = document.getElementById('selectedFiles');
    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearBtn');
    const progressArea = document.getElementById('progressArea');
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.getElementById('progressText');
    const previewArea = document.getElementById('previewArea');
    const slidePreview = document.getElementById('slidePreview');
    const slideQuality = document.getElementById('slideQuality');

    // Add page size and orientation options
    const pageSize = document.getElementById('pageSize');
    const orientation = document.getElementById('orientation');
    const preserveAnimations = document.getElementById('preserveAnimations');

    let currentFile = null;
    let slides = [];

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
    clearBtn.addEventListener('click', () => {
        currentFile = null;
        slides = [];
        updateFileList();
        fileList.classList.add('d-none');
        previewArea.classList.add('d-none');
    });

    // Convert button handler
    convertBtn.addEventListener('click', async () => {
        if (!currentFile) {
            alert('Please select a PowerPoint file.');
            return;
        }

        try {
            progressArea.classList.remove('d-none');
            previewArea.classList.add('d-none');
            progressBar.style.width = '0%';
            progressText.textContent = 'Reading PowerPoint...';
            slides = [];

            const arrayBuffer = await readFileAsArrayBuffer(currentFile);
            
            // Parse PowerPoint using pptxjs
            const pptx = new PptxGenJS();
            await pptx.load(arrayBuffer);
            
            progressBar.style.width = '20%';
            progressText.textContent = 'Converting slides...';

            // Get page dimensions
            const pageDims = getPageDimensions(pageSize.value, orientation.value);
            
            // Create PDF document with custom page size
            const pdf = await PDFLib.PDFDocument.create();
            const quality = slideQuality.value;
            const scale = quality === 'high' ? 2 : quality === 'medium' ? 1.5 : 1;

            // Process each slide
            const slideCount = pptx.slides.length;
            for (let i = 0; i < slideCount; i++) {
                const slide = pptx.slides[i];
                
                // Convert slide to image
                const canvas = document.createElement('canvas');
                canvas.width = pageDims.width * scale;
                canvas.height = pageDims.height * scale;
                
                // Handle animations if enabled
                if (preserveAnimations.checked && slide.animations) {
                    for (const animation of slide.animations) {
                        await processAnimation(slide, animation, canvas);
                    }
                } else {
                    await slide.render(canvas);
                }
                
                // Add slide to PDF with proper scaling
                const slideImage = await pdf.embedPng(canvas.toDataURL('image/png'));
                const page = pdf.addPage([pageDims.width, pageDims.height]);
                
                // Calculate scaling to fit page while maintaining aspect ratio
                const scale = Math.min(
                    pageDims.width / slideImage.width,
                    pageDims.height / slideImage.height
                );
                
                const scaledWidth = slideImage.width * scale;
                const scaledHeight = slideImage.height * scale;
                
                // Center the slide on the page
                const x = (pageDims.width - scaledWidth) / 2;
                const y = (pageDims.height - scaledHeight) / 2;
                
                page.drawImage(slideImage, {
                    x,
                    y,
                    width: scaledWidth,
                    height: scaledHeight,
                });

                // Add slide number
                const helveticaFont = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
                page.drawText(`${i + 1} / ${slideCount}`, {
                    x: pageDims.width - 40,
                    y: 10,
                    size: 10,
                    font: helveticaFont,
                    color: PDFLib.rgb(0.6, 0.6, 0.6),
                });

                // Store slide preview
                slides.push(canvas.toDataURL('image/jpeg', 0.7));

                // Update progress
                const progress = 20 + ((i + 1) / slideCount) * 70;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `Converting slide ${i + 1} of ${slideCount}...`;
            }

            // Add metadata
            pdf.setTitle(currentFile.name);
            pdf.setAuthor('PDFRocket.site');
            pdf.setCreator('PDFRocket.site PPT to PDF Converter');
            pdf.setProducer('PDFRocket.site by Aqib Chaudhary');
            pdf.setCreationDate(new Date());

            // Add watermark
            const pages = pdf.getPages();
            const helveticaFont = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
            
            pages.forEach(page => {
                page.drawText('Created with PDFRocket.site by Aqib Chaudhary', {
                    x: 10,
                    y: 10,
                    size: 8,
                    font: helveticaFont,
                    color: PDFLib.rgb(0.6, 0.6, 0.6),
                });
            });

            // Show preview with enhanced UI
            progressBar.style.width = '95%';
            progressText.textContent = 'Generating preview...';

            slidePreview.innerHTML = slides.map((slideData, index) => `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card h-100 shadow-sm">
                        <img src="${slideData}" class="card-img-top" alt="Slide ${index + 1}">
                        <div class="card-body">
                            <h5 class="card-title">Slide ${index + 1}</h5>
                            <p class="card-text text-muted">Click to view full size</p>
                        </div>
                    </div>
                </div>
            `).join('');

            // Add click handlers for preview
            slidePreview.querySelectorAll('.card').forEach((card, index) => {
                card.style.cursor = 'pointer';
                card.addEventListener('click', () => {
                    showFullSizePreview(slides[index], index + 1);
                });
            });

            // Save and download PDF
            const pdfBytes = await pdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = currentFile.name.replace(/\.(ppt|pptx)$/, '.pdf');
            link.click();
            
            // Clean up
            URL.revokeObjectURL(url);
            previewArea.classList.remove('d-none');
            progressText.textContent = 'Conversion complete!';
            progressBar.style.width = '100%';
            
            setTimeout(() => {
                progressArea.classList.add('d-none');
            }, 2000);

        } catch (error) {
            console.error('Conversion error:', error);
            progressText.textContent = 'Error during conversion. Please try again.';
            progressBar.classList.add('bg-danger');
        }
    });

    // Helper functions
    function handleFiles(fileList) {
        const file = fileList[0];
        
        if (!file) return;

        if (!file.name.match(/\.(ppt|pptx)$/i)) {
            alert('Please select a PowerPoint file (.ppt or .pptx).');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('File size must not exceed 10MB.');
            return;
        }

        currentFile = file;
        slides = [];
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

    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // Expose removeFile to global scope
    window.removeFile = function() {
        currentFile = null;
        slides = [];
        updateFileList();
        previewArea.classList.add('d-none');
    };

    function getPageDimensions(size, orientation) {
        const sizes = {
            'A4': { width: 210, height: 297 },
            'letter': { width: 216, height: 279 },
            'legal': { width: 216, height: 356 },
            '16:9': { width: 297, height: 167 },
            '4:3': { width: 297, height: 223 }
        };

        const dims = sizes[size];
        return orientation === 'landscape' 
            ? { width: dims.height, height: dims.width }
            : dims;
    }

    async function processAnimation(slide, animation, canvas) {
        // Basic animation processing
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Render base slide
        await slide.render(canvas);
        
        // Apply animation effect
        switch (animation.type) {
            case 'fade':
                ctx.globalAlpha = 0.7;
                break;
            case 'slide':
                ctx.translate(animation.x || 0, animation.y || 0);
                break;
            case 'zoom':
                ctx.scale(animation.scale || 1, animation.scale || 1);
                break;
        }
        
        // Re-render with animation
        await slide.render(canvas);
        ctx.resetTransform();
        ctx.globalAlpha = 1;
    }

    function showFullSizePreview(slideData, slideNumber) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Slide ${slideNumber}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <img src="${slideData}" class="img-fluid" alt="Slide ${slideNumber}">
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }
}); 