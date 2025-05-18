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
    const imagePreview = document.getElementById('imagePreview');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const imageQuality = document.getElementById('imageQuality');

    let currentFile = null;
    let convertedImages = [];

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
        convertedImages = [];
        updateFileList();
        fileList.classList.add('d-none');
        previewArea.classList.add('d-none');
    });

    // Download all button handler
    downloadAllBtn.addEventListener('click', async () => {
        if (convertedImages.length === 0) return;

        const zip = new JSZip();
        
        // Add each image to the zip
        convertedImages.forEach((imageData, index) => {
            const fileName = `page_${index + 1}.jpg`;
            zip.file(fileName, imageData.split(',')[1], { base64: true });
        });

        // Generate and download zip file
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = currentFile.name.replace('.pdf', '_images.zip');
        link.click();
        URL.revokeObjectURL(url);
    });

    // Convert button handler
    convertBtn.addEventListener('click', async () => {
        if (!currentFile) {
            alert('Please select a PDF file.');
            return;
        }

        try {
            progressArea.classList.remove('d-none');
            previewArea.classList.add('d-none');
            progressBar.style.width = '0%';
            progressText.textContent = 'Reading PDF...';
            convertedImages = [];

            const arrayBuffer = await readFileAsArrayBuffer(currentFile);
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            progressBar.style.width = '20%';
            progressText.textContent = 'Converting pages...';

            const scale = parseFloat(imageQuality.value);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Process each page
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale });
                
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvasContext: ctx,
                    viewport: viewport
                }).promise;

                // Convert canvas to JPG
                const imageData = canvas.toDataURL('image/jpeg', 0.8);
                convertedImages.push(imageData);

                // Update progress
                const progress = 20 + (i / pdf.numPages) * 70;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `Converting page ${i} of ${pdf.numPages}...`;
            }

            // Show preview
            progressBar.style.width = '95%';
            progressText.textContent = 'Generating preview...';

            imagePreview.innerHTML = convertedImages.map((imageData, index) => `
                <div class="col-md-6 col-lg-4">
                    <div class="card">
                        <img src="${imageData}" class="card-img-top" alt="Page ${index + 1}">
                        <div class="card-body">
                            <h5 class="card-title">Page ${index + 1}</h5>
                            <a href="${imageData}" download="page_${index + 1}.jpg" class="btn btn-sm btn-primary">Download</a>
                        </div>
                    </div>
                </div>
            `).join('');

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

        if (!file.type.match('application/pdf')) {
            alert('Please select a PDF file.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('File size must not exceed 10MB.');
            return;
        }

        currentFile = file;
        convertedImages = [];
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
        convertedImages = [];
        updateFileList();
        previewArea.classList.add('d-none');
    };
}); 