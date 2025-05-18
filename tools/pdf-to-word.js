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

    // Initialize PDF.js worker
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
            alert('Please select a PDF file.');
            return;
        }

        try {
            progressArea.classList.remove('d-none');
            progressBar.style.width = '0%';
            progressText.textContent = 'Reading PDF...';

            const arrayBuffer = await readFileAsArrayBuffer(currentFile);
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            progressBar.style.width = '20%';
            progressText.textContent = 'Extracting content...';

            // Create a new Word document
            const doc = new docx.Document({
                sections: [{
                    properties: {},
                    children: []
                }]
            });

            // Process each page
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                // Add page content to Word document
                const textItems = textContent.items.map(item => item.str).join(' ');
                doc.addSection({
                    children: [
                        new docx.Paragraph({
                            children: [new docx.TextRun(textItems)]
                        })
                    ]
                });

                // Update progress
                const progress = 20 + (i / pdf.numPages) * 60;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `Processing page ${i} of ${pdf.numPages}...`;
            }

            progressBar.style.width = '90%';
            progressText.textContent = 'Generating Word document...';

            // Generate Word document
            const docBlob = await docx.Packer.toBlob(doc);
            
            // Create download link
            const url = URL.createObjectURL(docBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = currentFile.name.replace('.pdf', '.docx');
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

        if (!file.type.match('application/pdf')) {
            alert('Please select a PDF file.');
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