// Tool Search and Filtering
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('toolSearch');
    const toolCards = document.querySelectorAll('.tool-card');

    // Search functionality
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        
        toolCards.forEach(card => {
            const title = card.querySelector('.card-title').textContent.toLowerCase();
            const description = card.querySelector('.card-text').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || description.includes(searchTerm)) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });

        // Show/hide section headers based on visible tools
        document.querySelectorAll('section').forEach(section => {
            const visibleTools = section.querySelectorAll('.tool-card:not(.hidden)').length;
            if (visibleTools === 0) {
                section.classList.add('hidden');
            } else {
                section.classList.remove('hidden');
            }
        });
    });

    // Initialize AdSense
    try {
        (adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
        console.log('AdSense error:', e);
    }

    // Add branding to all pages
    addBranding();
});

// Add branding to all pages
function addBranding() {
    const brandingContainer = document.createElement('div');
    brandingContainer.className = 'branding-text';
    brandingContainer.innerHTML = 'App Built By <a href="https://pdfrocket.site">Aqib Chaudhary</a>';
    
    // Add branding to tool pages if not on homepage
    if (!document.querySelector('header')) {
        document.body.insertBefore(brandingContainer, document.body.firstChild);
    }
}

// Tool-specific functionality
function initializeTool(toolName) {
    console.log(`Initializing ${toolName} tool...`);
    // Tool-specific initialization code will be added here
}

// Utility functions for PDF processing
const PDFTools = {
    // Convert file to PDF
    convertToPDF: async function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                // PDF conversion logic will be implemented here
                resolve(e.target.result);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    // Merge PDF files
    mergePDFs: async function(files) {
        // PDF merging logic will be implemented here
    },

    // Split PDF file
    splitPDF: async function(file, pages) {
        // PDF splitting logic will be implemented here
    },

    // Extract text from PDF
    extractText: async function(file) {
        // Text extraction logic will be implemented here
    }
};

// Error handling
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Error: ', msg, '\nURL: ', url, '\nLine: ', lineNo, '\nColumn: ', columnNo, '\nError object: ', error);
    return false;
}; 