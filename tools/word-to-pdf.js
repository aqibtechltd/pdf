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

    let currentFile = null;

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
        updateFileList();
        fileList.classList.add('d-none');
    });

    // Convert button handler
    convertBtn.addEventListener('click', async () => {
        if (!currentFile) {
            alert('Please select a Word document.');
            return;
        }

        try {
            progressArea.classList.remove('d-none');
            progressBar.style.width = '0%';
            progressText.textContent = 'Converting...';

            // Read the Word file
            const arrayBuffer = await readFileAsArrayBuffer(currentFile);
            
            // Convert Word to HTML using mammoth.js
            progressBar.style.width = '30%';
            progressText.textContent = 'Processing document...';
            
            const result = await mammoth.convertToHtml({ arrayBuffer });
            const html = result.value;

            // Create PDF
            progressBar.style.width = '60%';
            progressText.textContent = 'Generating PDF...';

            const pdf = await PDFLib.PDFDocument.create();
            const page = pdf.addPage([612, 792]); // US Letter size
            const helveticaFont = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);

            // Convert HTML to text (basic conversion)
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const text = tempDiv.textContent;

            // Split text into lines and add to PDF
            const lines = text.split('\n');
            let y = 750; // Start from top
            const fontSize = 12;
            const lineHeight = 14;
            const margin = 50;

            for (const line of lines) {
                if (y < margin) {
                    // Add new page if we run out of space
                    const newPage = pdf.addPage([612, 792]);
                    y = 750;
                }

                if (line.trim()) {
                    page.drawText(line.trim(), {
                        x: margin,
                        y: y,
                        size: fontSize,
                        font: helveticaFont,
                        color: PDFLib.rgb(0, 0, 0),
                    });
                }
                y -= lineHeight;
            }

            // Add watermark
            const pages = pdf.getPages();
            pages.forEach(page => {
                page.drawText('Created with PDFRocket.site by Aqib Chaudhary', {
                    x: 10,
                    y: 10,
                    size: 8,
                    font: helveticaFont,
                    color: PDFLib.rgb(0.6, 0.6, 0.6),
                });
            });

            progressBar.style.width = '90%';
            progressText.textContent = 'Finalizing...';

            const pdfBytes = await pdf.save();
            
            // Create download link
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = currentFile.name.replace(/\.(doc|docx)$/, '.pdf');
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
        const file = fileList[0];
        
        if (!file) return;

        if (!file.name.match(/\.(doc|docx)$/i)) {
            alert('Please select a Word document (.doc or .docx).');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('File size must not exceed 10MB.');
            return;
        }

        currentFile = file;
        updateFileList();
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
        updateFileList();
    };
}); 