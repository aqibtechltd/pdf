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
    const pdfPreview = document.getElementById('pdfPreview');
    const pdfaVersion = document.getElementById('pdfaVersion');

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
        previewArea.classList.add('d-none');
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

            const arrayBuffer = await readFileAsArrayBuffer(currentFile);
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            
            progressBar.style.width = '20%';
            progressText.textContent = 'Converting to PDF/A...';

            // Create PDF/A metadata
            const version = pdfaVersion.value;
            const pdfDoc = await convertToPDFA(pdfDoc, version);
            
            progressBar.style.width = '60%';
            progressText.textContent = 'Embedding fonts...';

            // Embed fonts (required for PDF/A)
            const pages = pdfDoc.getPages();
            const helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            
            // Add watermark
            pages.forEach(page => {
                page.drawText('Created with PDFRocket.site by Aqib Chaudhary', {
                    x: 10,
                    y: 10,
                    size: 8,
                    font: helveticaFont,
                    color: PDFLib.rgb(0.6, 0.6, 0.6),
                });
            });

            progressBar.style.width = '80%';
            progressText.textContent = 'Generating preview...';

            // Create preview
            const previewPage = pages[0];
            const previewCanvas = document.createElement('canvas');
            const scale = 0.5;
            previewCanvas.width = previewPage.getWidth() * scale;
            previewCanvas.height = previewPage.getHeight() * scale;

            // Draw preview
            const ctx = previewCanvas.getContext('2d');
            const previewBytes = await pdfDoc.save();
            const previewBlob = new Blob([previewBytes], { type: 'application/pdf' });
            const previewUrl = URL.createObjectURL(previewBlob);

            // Show preview
            pdfPreview.innerHTML = `
                <div class="text-center">
                    <embed src="${previewUrl}#page=1" type="application/pdf" width="100%" height="500px">
                </div>
            `;

            progressBar.style.width = '90%';
            progressText.textContent = 'Saving PDF/A...';

            // Save PDF/A
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = currentFile.name.replace('.pdf', '_pdfa.pdf');
            link.click();

            // Clean up
            URL.revokeObjectURL(url);
            URL.revokeObjectURL(previewUrl);
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

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function generateXMPMetadata(metadata, conformance) {
        const now = new Date().toISOString();
        return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
        <rdf:Description rdf:about=""
            xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
            xmlns:dc="http://purl.org/dc/elements/1.1/"
            xmlns:xmp="http://ns.adobe.com/xap/1.0/"
            xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
            xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/">
            <pdf:Producer>${metadata.producer}</pdf:Producer>
            <pdf:Creator>${metadata.creator}</pdf:Creator>
            <dc:title>${metadata.title}</dc:title>
            <dc:creator>${metadata.author}</dc:creator>
            <dc:description>${metadata.subject}</dc:description>
            <dc:subject>${metadata.keywords}</dc:subject>
            <xmp:CreateDate>${metadata.creationDate.toISOString()}</xmp:CreateDate>
            <xmp:ModifyDate>${metadata.modDate.toISOString()}</xmp:ModifyDate>
            <xmp:MetadataDate>${now}</xmp:MetadataDate>
            <pdfaid:part>${conformance.part}</pdfaid:part>
            <pdfaid:conformance>${conformance.conformance}</pdfaid:conformance>
            <pdfaid:amd>pdf/a-${conformance.part}${conformance.conformance}</pdfaid:amd>
            <pdfaid:documentId>${conformance.documentId}</pdfaid:documentId>
            <pdfaid:instanceId>${conformance.instanceId}</pdfaid:instanceId>
        </rdf:Description>
    </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
    }

    // Expose removeFile to global scope
    window.removeFile = function() {
        currentFile = null;
        updateFileList();
        previewArea.classList.add('d-none');
    };

    async function convertToPDFA(inputPdfDoc, version) {
        progressBar.style.width = '40%';
        progressText.textContent = 'Converting to PDF/A...';

        // Embed ICC color profile
        const sRGBProfile = await fetch('../assets/sRGB_v4_ICC_preference.icc').then(r => r.arrayBuffer());
        inputPdfDoc.setColorSpace('sRGB', sRGBProfile);

        // Set PDF/A version and conformance
        const pdfaVersion = {
            '1b': { part: 1, conformance: 'B' },
            '1a': { part: 1, conformance: 'A' },
            '2b': { part: 2, conformance: 'B' },
            '2a': { part: 2, conformance: 'A' },
            '3b': { part: 3, conformance: 'B' },
            '3a': { part: 3, conformance: 'A' }
        }[version];

        // Embed fonts with subsetting
        progressBar.style.width = '50%';
        progressText.textContent = 'Embedding fonts...';

        const pages = inputPdfDoc.getPages();
        const fonts = new Set();
        
        for (const page of pages) {
            const pagefonts = await page.getFonts();
            pagefonts.forEach(font => fonts.add(font));
        }

        for (const font of fonts) {
            await inputPdfDoc.embedFont(font, { subset: true });
        }

        // Add PDF/A metadata
        progressBar.style.width = '60%';
        progressText.textContent = 'Adding PDF/A metadata...';

        const metadata = {
            title: currentFile.name,
            author: 'PDFRocket.site',
            subject: 'PDF/A conversion',
            keywords: 'pdf, pdfa, archive, conversion',
            creator: 'PDFRocket.site by Aqib Chaudhary',
            producer: 'PDFRocket.site PDF/A Converter',
            creationDate: new Date(),
            modDate: new Date(),
            trapped: 'False'
        };

        // Set document metadata
        Object.entries(metadata).forEach(([key, value]) => {
            inputPdfDoc[`set${key.charAt(0).toUpperCase()}${key.slice(1)}`](value);
        });

        // Generate and set XMP metadata
        const xmpMetadata = generateXMPMetadata(metadata, pdfaVersion);
        inputPdfDoc.setXmpMetadata(xmpMetadata);

        // Add PDF/A identifier
        progressBar.style.width = '70%';
        progressText.textContent = 'Adding PDF/A identifiers...';

        const pdfaId = {
            part: pdfaVersion.part,
            conformance: pdfaVersion.conformance,
            amd: '',
            corr: ''
        };

        inputPdfDoc.addPDFAIdentifier(pdfaId);

        // Validate PDF/A compliance
        progressBar.style.width = '80%';
        progressText.textContent = 'Validating PDF/A compliance...';

        const validationResult = await validatePDFA(inputPdfDoc, version);
        if (!validationResult.isValid) {
            throw new Error(`PDF/A validation failed: ${validationResult.errors.join(', ')}`);
        }

        return inputPdfDoc;
    }

    async function validatePDFA(pdfDocument, version) {
        const validation = {
            isValid: true,
            errors: []
        };

        // Check for required elements
        if (!pdfDocument.catalog.has('Metadata')) {
            validation.isValid = false;
            validation.errors.push('Missing XMP metadata');
        }

        if (!pdfDocument.catalog.has('OutputIntents')) {
            validation.isValid = false;
            validation.errors.push('Missing OutputIntents (ICC profile)');
        }

        // Check fonts
        const pages = pdfDocument.getPages();
        for (const page of pages) {
            const fonts = await page.getFonts();
            for (const font of fonts) {
                if (!font.isEmbedded) {
                    validation.isValid = false;
                    validation.errors.push(`Font not embedded: ${font.name}`);
                }
            }
        }

        // Check for encryption
        if (pdfDocument.isEncrypted) {
            validation.isValid = false;
            validation.errors.push('PDF is encrypted');
        }

        // Check for transparency
        if (await hasTransparency(pdfDocument)) {
            validation.isValid = false;
            validation.errors.push('Document contains transparency');
        }

        return validation;
    }

    async function hasTransparency(pdfDoc) {
        // Implementation to check for transparency in the PDF
        // This is a simplified check
        const pages = pdfDoc.getPages();
        for (const page of pages) {
            const operators = await page.getOperators();
            for (const op of operators) {
                if (op.name === 'gs' && op.args.some(arg => arg.has('CA') || arg.has('ca'))) {
                    return true;
                }
            }
        }
        return false;
    }
}); 