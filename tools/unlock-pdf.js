document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const pdfPreview = document.getElementById('pdfPreview');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const pdfPassword = document.getElementById('pdfPassword');
    const togglePassword = document.getElementById('togglePassword');
    const unlockBtn = document.getElementById('unlockBtn');
    const clearBtn = document.getElementById('clearBtn');
    const progressArea = document.getElementById('progressArea');
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.getElementById('progressText');

    let currentPdfFile = null;

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
        pdfPreview.classList.add('d-none');
        fileInput.value = '';
        pdfPassword.value = '';
    });

    // Toggle password visibility
    togglePassword.addEventListener('click', () => {
        if (pdfPassword.type === 'password') {
            pdfPassword.type = 'text';
            togglePassword.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            pdfPassword.type = 'password';
            togglePassword.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });

    // Unlock button handler
    unlockBtn.addEventListener('click', async () => {
        if (!currentPdfFile) {
            alert('Please select a PDF file first.');
            return;
        }

        if (!pdfPassword.value) {
            alert('Please enter the PDF password.');
            return;
        }

        try {
            progressArea.classList.remove('d-none');
            progressBar.style.width = '0%';
            progressText.textContent = 'Reading PDF file...';

            const arrayBuffer = await readFileAsArrayBuffer(currentPdfFile);
            
            // Try to load the PDF with the provided password
            let pdfDoc;
            try {
                pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, {
                    password: pdfPassword.value
                });
            } catch (error) {
                console.error('Password error:', error);
                alert('Incorrect password. Please try again.');
                progressArea.classList.add('d-none');
                return;
            }

            progressBar.style.width = '50%';
            progressText.textContent = 'Removing password protection...';

            // Create a new PDF without password
            const newPdfDoc = await PDFLib.PDFDocument.create();
            
            // Copy all pages from the original PDF
            const pages = await newPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach(page => newPdfDoc.addPage(page));

            progressBar.style.width = '80%';
            progressText.textContent = 'Adding watermark...';

            // Add watermark to each page
            const helveticaFont = await newPdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            newPdfDoc.getPages().forEach(page => {
                page.drawText('Created with PDFRocket.site by Aqib Chaudhary', {
                    x: 10,
                    y: 10,
                    size: 8,
                    font: helveticaFont,
                    color: PDFLib.rgb(0.6, 0.6, 0.6),
                });
            });

            // Save and download
            progressBar.style.width = '90%';
            progressText.textContent = 'Creating download file...';
            
            const pdfBytes = await newPdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'unlocked.pdf';
            link.click();

            // Clean up
            URL.revokeObjectURL(url);
            progressText.textContent = 'PDF unlocked successfully!';
            progressBar.style.width = '100%';
            
            setTimeout(() => {
                progressArea.classList.add('d-none');
            }, 2000);

        } catch (error) {
            console.error('Unlock error:', error);
            progressText.textContent = 'Error unlocking PDF. Please try again.';
            progressBar.classList.add('bg-danger');
        }
    });

    // Helper functions
    function handleFile(file) {
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
        
        // Update file info
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        
        // Show preview area
        pdfPreview.classList.remove('d-none');
        
        // Clear previous password
        pdfPassword.value = '';
        pdfPassword.type = 'password';
        togglePassword.innerHTML = '<i class="fas fa-eye"></i>';
    }

    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}); 