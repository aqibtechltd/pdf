document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const metadataEditor = document.getElementById('metadataEditor');
    const currentMetadata = document.getElementById('currentMetadata');
    const title = document.getElementById('title');
    const author = document.getElementById('author');
    const subject = document.getElementById('subject');
    const keywords = document.getElementById('keywords');
    const creator = document.getElementById('creator');
    const producer = document.getElementById('producer');
    const creationDate = document.getElementById('creationDate');
    const modDate = document.getElementById('modDate');
    const saveMetadata = document.getElementById('saveMetadata');
    const clearBtn = document.getElementById('clearBtn');
    const progressArea = document.getElementById('progressArea');
    const progressBar = progressArea.querySelector('.progress-bar');
    const progressText = document.getElementById('progressText');

    // State
    let currentFile = null;
    let currentPdfDoc = null;

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
        if (files.length > 0) handleFileSelection(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });

    clearBtn.addEventListener('click', () => {
        currentFile = null;
        currentPdfDoc = null;
        fileInput.value = '';
        metadataEditor.classList.add('d-none');
        clearForm();
    });

    saveMetadata.addEventListener('click', async () => {
        if (!currentFile || !currentPdfDoc) return;

        try {
            progressArea.classList.remove('d-none');
            progressBar.style.width = '0%';
            progressText.textContent = 'Reading PDF file...';

            const arrayBuffer = await readFileAsArrayBuffer(currentFile);
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            
            progressBar.style.width = '30%';
            progressText.textContent = 'Updating metadata...';

            // Update metadata
            pdfDoc.setTitle(title.value);
            pdfDoc.setAuthor(author.value);
            pdfDoc.setSubject(subject.value);
            pdfDoc.setKeywords(keywords.value.split(',').map(k => k.trim()));
            pdfDoc.setCreator(creator.value);
            pdfDoc.setProducer(producer.value);
            
            if (creationDate.value) {
                pdfDoc.setCreationDate(new Date(creationDate.value));
            }
            if (modDate.value) {
                pdfDoc.setModificationDate(new Date(modDate.value));
            }

            progressBar.style.width = '60%';
            progressText.textContent = 'Adding watermark...';

            // Add watermark to each page
            const helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            pdfDoc.getPages().forEach(page => {
                page.drawText('Created with PDFRocket.site by Aqib Chaudhary', {
                    x: 10,
                    y: 10,
                    size: 8,
                    font: helveticaFont,
                    color: PDFLib.rgb(0.6, 0.6, 0.6),
                });
            });

            progressBar.style.width = '90%';
            progressText.textContent = 'Creating download file...';

            // Save the PDF
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = currentFile.name.replace('.pdf', '_metadata.pdf');
            link.click();

            // Clean up
            URL.revokeObjectURL(url);
            progressText.textContent = 'Metadata update complete!';
            progressBar.style.width = '100%';
            
            setTimeout(() => {
                progressArea.classList.add('d-none');
            }, 2000);

        } catch (error) {
            console.error('Error:', error);
            progressText.textContent = 'Error updating metadata. Please try again.';
            progressBar.classList.add('bg-danger');
        }
    });

    // Helper Functions
    async function handleFileSelection(file) {
        if (!file.type.includes('pdf')) {
            alert('Please select a PDF file.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB.');
            return;
        }

        currentFile = file;
        try {
            const arrayBuffer = await readFileAsArrayBuffer(file);
            currentPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            
            // Display current metadata
            displayMetadata(currentPdfDoc);
            
            // Show editor
            metadataEditor.classList.remove('d-none');
        } catch (error) {
            console.error('Error loading PDF:', error);
            alert('Error loading PDF file. Please try another file.');
        }
    }

    function displayMetadata(pdfDoc) {
        // Get metadata
        const info = {
            Title: pdfDoc.getTitle() || '',
            Author: pdfDoc.getAuthor() || '',
            Subject: pdfDoc.getSubject() || '',
            Keywords: (pdfDoc.getKeywords() || []).join(', '),
            Creator: pdfDoc.getCreator() || '',
            Producer: pdfDoc.getProducer() || '',
            CreationDate: formatDate(pdfDoc.getCreationDate()),
            ModificationDate: formatDate(pdfDoc.getModificationDate())
        };

        // Update form
        title.value = info.Title;
        author.value = info.Author;
        subject.value = info.Subject;
        keywords.value = info.Keywords;
        creator.value = info.Creator;
        producer.value = info.Producer;
        creationDate.value = info.CreationDate ? new Date(info.CreationDate).toISOString().slice(0, 16) : '';
        modDate.value = info.ModificationDate ? new Date(info.ModificationDate).toISOString().slice(0, 16) : '';

        // Display current metadata
        currentMetadata.innerHTML = Object.entries(info)
            .map(([key, value]) => `
                <div class="mb-1">
                    <strong>${key}:</strong> 
                    <span class="text-muted">${value || '(not set)'}</span>
                </div>
            `).join('');
    }

    function clearForm() {
        title.value = '';
        author.value = '';
        subject.value = '';
        keywords.value = '';
        creator.value = '';
        producer.value = '';
        creationDate.value = '';
        modDate.value = '';
        currentMetadata.innerHTML = '';
    }

    function formatDate(date) {
        if (!date) return '';
        return new Date(date).toLocaleString();
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