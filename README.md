# PDFRocket.site - Ultimate Online PDF Tools Platform

A comprehensive collection of free online PDF tools built with pure HTML5, CSS3, and Vanilla JavaScript. All tools work client-side, ensuring user privacy and fast processing.

## Features

- 20+ PDF tools including converters, editors, and utilities
- Pure client-side processing (no server uploads required)
- Mobile-responsive design using Bootstrap 5
- SEO optimized with meta tags and sitemap
- Google AdSense integration ready
- Consistent branding across all tools

## Tools Available

### PDF Converters
- JPG to PDF
- Word to PDF
- Excel to PDF
- PPT to PDF
- HTML to PDF
- PDF to Word
- PDF to JPG
- PDF to PDF/A

### PDF Editors
- Merge PDF
- Split PDF
- Rotate PDF
- Unlock PDF
- Crop PDF
- Compress PDF
- Add Watermark

### PDF Utilities
- Extract Text
- Add Page Numbers
- Edit Metadata
- OCR (Text Recognition)

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pdfrocket.site.git
   cd pdfrocket.site
   ```

2. Update Google AdSense ID:
   - Replace `ca-pub-your-id` with your actual Google AdSense publisher ID in all HTML files

3. Update Site URL:
   - Replace all instances of `https://pdfrocket.site` with your actual domain name
   - Update the sitemap.xml with your domain name

4. Testing Locally:
   - Use a local development server (e.g., Live Server VS Code extension)
   - Open index.html in your browser

## Deployment

### Option 1: Netlify
1. Create a new site from Git
2. Choose your repository
3. Build settings:
   - Build command: (none required)
   - Publish directory: ./

### Option 2: Vercel
1. Import your Git repository
2. Configure project:
   - Framework Preset: Other
   - Build Command: (none required)
   - Output Directory: ./

## Development

### File Structure
```
pdfrocket.site/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── main.js
├── tools/
│   ├── jpg-to-pdf.html
│   ├── jpg-to-pdf.js
│   └── ... (other tool files)
├── robots.txt
├── sitemap.xml
└── README.md
```

### Adding New Tools
1. Create a new HTML file in the `tools/` directory
2. Create a corresponding JavaScript file if needed
3. Add the tool to the grid in `index.html`
4. Update `sitemap.xml` with the new tool URL

## SEO Optimization

- Each tool page includes:
  - Unique meta description
  - Keyword-rich title
  - Semantic HTML structure
  - Mobile-friendly design
  - Fast loading times

## Branding

All tools include the "App Built By Aqib Chaudhary" branding:
- Header section of each tool
- Watermark on generated PDFs
- Footer credits

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Aqib Chaudhary
- Website: [PDFRocket.site](https://pdfrocket.site)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 