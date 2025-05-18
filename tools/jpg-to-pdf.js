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

    let files = [];

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
        files = [];
        updateFileList();
        fileList.classList.add('d-none');
    });

    // Convert button handler
    convertBtn.addEventListener('click', async () => {
        if (files.length === 0) {
            alert('Please select at least one JPG file.');
            return;
        }

        try {
            progressArea.classList.remove('d-none');
            progressBar.style.width = '0%';
            progressText.textContent = 'Converting...';

            const pdf = await PDFLib.PDFDocument.create();
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const imageBytes = await readFileAsArrayBuffer(file);
                const image = await pdf.embedJpg(imageBytes);
                
                const page = pdf.addPage([image.width, image.height]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height,
                });

                // Update progress
                const progress = ((i + 1) / files.length) * 100;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `Converting image ${i + 1} of ${files.length}...`;
            }

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

            const pdfBytes = await pdf.save();
            
            // Create download link
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'converted.pdf';
            link.click();
            
            // Clean up
            URL.revokeObjectURL(url);
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
        const newFiles = Array.from(fileList).filter(file => {
            if (!file.type.match('image/jpeg')) {
                alert('Please select only JPG files.');
                return false;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must not exceed 5MB.');
                return false;
            }
            return true;
        });

        if (files.length + newFiles.length > 10) {
            alert('Maximum 10 files allowed.');
            return;
        }

        files = [...files, ...newFiles];
        updateFileList();
    }

    function updateFileList() {
        if (files.length > 0) {
            fileList.classList.remove('d-none');
            selectedFiles.innerHTML = files.map((file, index) => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${file.name}
                    <button class="btn btn-sm btn-danger" onclick="removeFile(${index})">Remove</button>
                </li>
            `).join('');
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
    window.removeFile = function(index) {
        files.splice(index, 1);
        updateFileList();
    };
}); 