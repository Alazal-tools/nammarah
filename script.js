const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const dropzoneContent = document.querySelector('.dropzone-content');
const previewArea = document.getElementById('preview-area');
const canvasWrapper = document.getElementById('canvas-wrapper');
const pdfPreview = document.getElementById('pdf-preview');
const overlayContainer = document.getElementById('overlay-container');
const sidebar = document.getElementById('sidebar');
const addNumberBtn = document.getElementById('add-number-btn');
const generateBtn = document.getElementById('generate-btn');
const fieldsContainer = document.getElementById('numbering-fields-container');
const template = document.getElementById('numbering-field-template');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const resetBtn = document.getElementById('reset-btn');

const exportModal = document.getElementById('export-modal');
const estimatedSizeEl = document.getElementById('estimated-size');
const cancelExportBtn = document.getElementById('cancel-export-btn');
const confirmExportBtn = document.getElementById('confirm-export-btn');
const compressionOptions = document.getElementById('compression-options');
const qualityCompress = document.getElementById('quality-compress');

let loadedFileBuffer = null;
let loadedFileType = '';
let originalPdfWidth = 0;
let originalPdfHeight = 0;
let originalFileName = 'document';
let numberingFields = [];
let fieldIdCounter = 0;

// === Event Listeners for Upload ===
dropzoneContent.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
});

// === File Handling ===
async function handleFile(file) {
    if (!file) return;
    
    if (!file.type.match('application/pdf') && !file.type.match('image.*')) {
        alert('الرجاء اختيار ملف PDF أو صورة.');
        return;
    }

    showLoading('جاري قراءة الملف...');
    originalFileName = file.name;
    loadedFileType = file.type;

    try {
        const arrayBuffer = await file.arrayBuffer();
        loadedFileBuffer = new Uint8Array(arrayBuffer);

        if (loadedFileType === 'application/pdf') {
            // Pass a copy so pdf.js worker doesn't detach the original array buffer
            await renderPDFPreview(loadedFileBuffer.slice(0));
        } else {
            await renderImagePreview(file);
        }

        // Show Workspace
        dropzone.classList.add('hidden');
        previewArea.classList.remove('hidden');
        sidebar.setAttribute('aria-disabled', 'false');
        addNumberBtn.disabled = false;
        generateBtn.disabled = false;
        resetBtn.disabled = false;

    } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء قراءة الملف.');
    } finally {
        hideLoading();
    }
}

async function renderPDFPreview(data) {
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1); // Only care about first page as template

    const viewport = page.getViewport({ scale: 1.5 });

    originalPdfWidth = page.getViewport({ scale: 1.0 }).width;
    originalPdfHeight = page.getViewport({ scale: 1.0 }).height;

    const context = pdfPreview.getContext('2d');
    pdfPreview.width = viewport.width;
    pdfPreview.height = viewport.height;

    // Scale wrapper to fit available space if needed, but for simplicity let's rely on CSS and scrolling
    canvasWrapper.style.width = `${viewport.width}px`;
    canvasWrapper.style.height = `${viewport.height}px`;

    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };

    await page.render(renderContext).promise;
}

async function renderImagePreview(file) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            originalPdfWidth = img.width;
            originalPdfHeight = img.height;

            // Limit preview size
            const scale = Math.min(1.0, 800 / img.width);
            const drawWidth = img.width * scale;
            const drawHeight = img.height * scale;

            pdfPreview.width = drawWidth;
            pdfPreview.height = drawHeight;
            canvasWrapper.style.width = `${drawWidth}px`;
            canvasWrapper.style.height = `${drawHeight}px`;

            const ctx = pdfPreview.getContext('2d');
            ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
            URL.revokeObjectURL(url);
            resolve();
        };
        img.src = url;
    });
}

// === Numbering Fields Logic ===
addNumberBtn.addEventListener('click', () => {
    fieldIdCounter++;
    const id = fieldIdCounter;

    // Default initial data
    const fieldData = {
        id: id,
        prefix: 'NO. ',
        start: 1,
        end: 10,
        repeat: false,
        x: canvasWrapper.clientWidth / 2, // center X
        y: canvasWrapper.clientHeight / 2, // center Y
        fontSize: 24,
        textColor: '#000000',
        bgColor: '#ffffff',
        bgEnabled: false,
        padding: 8,
        borderWidth: 0,
        borderColor: '#000000',
        alignment: 'center',
        copies: 1,
        rotation: 0,
        step: 1,
        paddingZeros: 3,
        suffix: ''
    };

    numberingFields.push(fieldData);

    createSidebarCard(fieldData);
    createOverlayElement(fieldData);
});

function createSidebarCard(field) {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.numbering-card');
    card.dataset.id = field.id;

    card.querySelector('.card-index').textContent = field.id;

    const prefixInput = card.querySelector('.input-prefix');
    const startInput = card.querySelector('.input-start');
    const endInput = card.querySelector('.input-end');
    const repeatInput = card.querySelector('.input-repeat');
    const deleteBtn = card.querySelector('.delete-btn');

    const fontSizeInput = card.querySelector('.input-fontsize');
    const textColorInput = card.querySelector('.input-textcolor');
    const bgColorInput = card.querySelector('.input-bgcolor');
    const bgEnabledInput = card.querySelector('.input-bg-enabled');
    const paddingInput = card.querySelector('.input-padding');
    const borderWidthInput = card.querySelector('.input-borderwidth');
    const borderColorInput = card.querySelector('.input-bordercolor');
    const alignBtns = card.querySelectorAll('.align-btn');
    
    const stepInput = card.querySelector('.input-step');
    const paddingZerosInput = card.querySelector('.input-padding-zeros');
    const suffixInput = card.querySelector('.input-suffix');
    const copiesInput = card.querySelector('.input-copies');
    const rotationInput = card.querySelector('.input-rotation');
    
    // Important to give repeat checkbox unique ID
    const repeatId = `repeat-${field.id}`;
    
    repeatInput.id = repeatId;
    if (repeatInput.nextElementSibling) repeatInput.nextElementSibling.setAttribute('for', repeatId);

    prefixInput.addEventListener('input', (e) => {
        field.prefix = e.target.value;
        updateOverlayStyle(field.id);
    });

    startInput.addEventListener('input', (e) => {
        field.start = parseInt(e.target.value) || 1;
        updateOverlayStyle(field.id);
    });

    endInput.addEventListener('input', (e) => {
        field.end = parseInt(e.target.value) || 1;
    });

    repeatInput.addEventListener('change', (e) => {
        field.repeat = e.target.checked;
    });

    fontSizeInput.addEventListener('input', (e) => { field.fontSize = parseInt(e.target.value) || 16; updateOverlayStyle(field.id); });
    textColorInput.addEventListener('input', (e) => { field.textColor = e.target.value; updateOverlayStyle(field.id); });
    bgColorInput.addEventListener('input', (e) => { field.bgColor = e.target.value; updateOverlayStyle(field.id); });
    bgEnabledInput.addEventListener('change', (e) => { field.bgEnabled = e.target.checked; updateOverlayStyle(field.id); });
    paddingInput.addEventListener('input', (e) => { field.padding = parseInt(e.target.value) || 0; updateOverlayStyle(field.id); });
    borderWidthInput.addEventListener('input', (e) => { field.borderWidth = parseInt(e.target.value) || 0; updateOverlayStyle(field.id); });
    borderColorInput.addEventListener('input', (e) => { field.borderColor = e.target.value; updateOverlayStyle(field.id); });

    alignBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            alignBtns.forEach(b => b.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            field.alignment = target.dataset.align;
            updateOverlayStyle(field.id);
        });
    });

    stepInput.addEventListener('input', (e) => { field.step = parseInt(e.target.value) || 1; updateOverlayStyle(field.id); });
    paddingZerosInput.addEventListener('input', (e) => { field.paddingZeros = parseInt(e.target.value) || 0; updateOverlayStyle(field.id); });
    suffixInput.addEventListener('input', (e) => { field.suffix = e.target.value; updateOverlayStyle(field.id); });
    copiesInput.addEventListener('input', (e) => { field.copies = parseInt(e.target.value) || 1; });
    rotationInput.addEventListener('change', (e) => { field.rotation = parseInt(e.target.value) || 0; updateOverlayStyle(field.id); });

    // Initial assignment
    prefixInput.value = field.prefix;
    startInput.value = field.start;
    endInput.value = field.end;
    repeatInput.checked = field.repeat;
    fontSizeInput.value = field.fontSize;
    textColorInput.value = field.textColor;
    bgColorInput.value = field.bgColor;
    bgEnabledInput.checked = field.bgEnabled;
    paddingInput.value = field.padding;
    borderWidthInput.value = field.borderWidth;
    borderColorInput.value = field.borderColor;
    stepInput.value = field.step;
    paddingZerosInput.value = field.paddingZeros;
    suffixInput.value = field.suffix;
    copiesInput.value = field.copies;
    rotationInput.value = field.rotation;

    deleteBtn.addEventListener('click', () => {
        card.remove();
        document.getElementById(`overlay-item-${field.id}`).remove();
        numberingFields = numberingFields.filter(f => f.id !== field.id);
    });

    fieldsContainer.appendChild(card);
}

function createOverlayElement(field) {
    const el = document.createElement('div');
    el.className = 'draggable-number';
    el.id = `overlay-item-${field.id}`;

    el.style.left = `${field.x}px`;
    el.style.top = `${field.y}px`;

    overlayContainer.appendChild(el);
    setupDragging(el, field);
    updateOverlayStyle(field.id); // Apply text and styles immediately
}

function formatNumber(value, field) {
    let str = value.toString();
    if (field.paddingZeros > 0) {
        str = str.padStart(field.paddingZeros, '0');
    }
    return `${field.prefix}${str}${field.suffix}`;
}

function updateOverlayStyle(id) {
    const field = numberingFields.find(f => f.id === id);
    if (!field) return;
    const el = document.getElementById(`overlay-item-${id}`);
    if (el) {
        el.textContent = formatNumber(field.start, field);
        el.style.fontSize = `${field.fontSize}px`;
        el.style.color = field.textColor;
        el.style.backgroundColor = field.bgEnabled ? field.bgColor : 'transparent';
        el.style.padding = `${field.padding}px`;
        el.style.border = `${field.borderWidth}px solid ${field.borderColor}`;
        let transformStr = '';
        // Alignment
        if (field.alignment === 'left') {
            transformStr = 'translate(0, -50%)';
            el.style.direction = 'ltr';
        } else if (field.alignment === 'right') {
            transformStr = 'translate(-100%, -50%)';
            el.style.direction = 'rtl';
        } else {
            transformStr = 'translate(-50%, -50%)';
            el.style.direction = 'ltr';
        }
        
        el.style.transform = `${transformStr} rotate(${field.rotation}deg)`;
    }
}

// === Drag and Drop on Canvas ===
function setupDragging(el, field) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    el.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = field.x;
        initialY = field.y;
        el.style.cursor = 'grabbing';
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newX = initialX + dx;
        let newY = initialY + dy;

        // Boundaries
        newX = Math.max(0, Math.min(newX, canvasWrapper.clientWidth));
        newY = Math.max(0, Math.min(newY, canvasWrapper.clientHeight));

        field.x = newX;
        field.y = newY;

        el.style.left = `${newX}px`;
        el.style.top = `${newY}px`;
    }

    function dragEnd() {
        if (!isDragging) return;
        isDragging = false;
        el.style.cursor = 'grab';
    }
}

// Helper for colors
function hexToRgbStruct(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
}

// === PDF Generation ===
const fontUrls = {
    'Cairo': 'https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/Cairo-Regular.ttf',
    'Tajawal': 'https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Regular.ttf',
    'Almarai': 'https://raw.githubusercontent.com/google/fonts/main/ofl/almarai/Almarai-Regular.ttf',
};

const fontCache = {};

async function getPdfFont(fontName, outPdf) {
    if (fontName === 'Helvetica') return await outPdf.embedFont(PDFLib.StandardFonts.Helvetica);
    if (fontCache[fontName]) return fontCache[fontName];

    try {
        const fontUrl = fontUrls[fontName] || fontUrls['Cairo'];
        const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
        const customFont = await outPdf.embedFont(fontBytes);
        fontCache[fontName] = customFont;
        return customFont;
    } catch (e) {
        console.warn("Failed to load custom font", fontName, e);
        const fallback = await outPdf.embedFont(PDFLib.StandardFonts.Helvetica);
        fontCache[fontName] = fallback;
        return fallback;
    }
}

generateBtn.addEventListener('click', () => {
    if (numberingFields.length === 0) {
        alert('الرجاء إضافة ترقيم واحد على الأقل.');
        return;
    }

    let totalPagesNeeded = 0;
    let anyNonRepeat = false;
    numberingFields.forEach(f => {
        const range = Math.abs(f.end - f.start);
        const seqLength = Math.max(1, Math.floor(range / f.step) + 1);
        if (!f.repeat) {
            totalPagesNeeded = Math.max(totalPagesNeeded, seqLength);
            anyNonRepeat = true;
        }
    });

    if (!anyNonRepeat) {
        numberingFields.forEach(f => {
            const range = Math.abs(f.end - f.start);
            const seqLength = Math.max(1, Math.floor(range / f.step) + 1);
            totalPagesNeeded = Math.max(totalPagesNeeded, seqLength);
        });
    }

    if (totalPagesNeeded <= 0) totalPagesNeeded = 1;

    let baseSize = loadedFileBuffer ? loadedFileBuffer.byteLength : 0;
    let estimatedBytes = baseSize + (totalPagesNeeded * 1024);
    let mb = estimatedBytes / (1024 * 1024);
    estimatedSizeEl.textContent = `~${mb.toFixed(2)} MB (${totalPagesNeeded} صفحات)`;

    compressionOptions.classList.remove('hidden');

    exportModal.classList.remove('hidden');
});

cancelExportBtn.addEventListener('click', () => {
    exportModal.classList.add('hidden');
});

confirmExportBtn.addEventListener('click', async () => {
    exportModal.classList.add('hidden');
    showLoading('جاري إنشاء ملف PDF...');

    try {
        const { PDFDocument, rgb } = PDFLib;
        const outPdf = await PDFDocument.create();

        // Register fontkit
        if (window.fontkit) {
            outPdf.registerFontkit(window.fontkit);
        }

        let embeddedTemplate;
        let isEmbeddedImage = false;

        const shouldCompress = qualityCompress.checked;

        if (loadedFileType === 'application/pdf') {
            if (shouldCompress) {
                // Rasterize PDF using pdf.js
                isEmbeddedImage = true;
                const loadingTask = pdfjsLib.getDocument({ data: loadedFileBuffer });
                const pdf = await loadingTask.promise;
                const page = await pdf.getPage(1);
                
                const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for decent print quality
                const cvs = document.createElement('canvas');
                cvs.width = viewport.width;
                cvs.height = viewport.height;
                const ctx = cvs.getContext('2d');
                
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                
                const dataUrl = cvs.toDataURL('image/jpeg', 0.6); // compress
                const base64Data = dataUrl.split(',')[1];
                const jpegBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                
                embeddedTemplate = await outPdf.embedJpg(jpegBytes);
            } else {
                isEmbeddedImage = false;
                const tempPdf = await PDFDocument.load(loadedFileBuffer);
                const embeddedPages = await outPdf.embedPdf(tempPdf, [0]);
                embeddedTemplate = embeddedPages[0];
            }
        } else {
            // It's an image
            isEmbeddedImage = true;
            let finalImageBuffer = loadedFileBuffer;
            if (shouldCompress) {
                // Compress via Canvas
                const img = new Image();
                const url = URL.createObjectURL(new Blob([loadedFileBuffer], { type: loadedFileType }));
                await new Promise(res => { img.onload = res; img.src = url; });

                const cvs = document.createElement('canvas');
                cvs.width = originalPdfWidth;
                cvs.height = originalPdfHeight;
                cvs.getContext('2d').drawImage(img, 0, 0);

                const dataUrl = cvs.toDataURL('image/jpeg', 0.6);
                const base64Data = dataUrl.split(',')[1];
                finalImageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                URL.revokeObjectURL(url);
            }

            embeddedTemplate = shouldCompress || loadedFileType === 'image/jpeg'
                ? await outPdf.embedJpg(finalImageBuffer)
                : await outPdf.embedPng(finalImageBuffer);
        }
        // Calculate max pages needed again for generation
        let totalPagesNeeded = 0;
        let anyNonRepeat = false;
        numberingFields.forEach(f => {
            const range = Math.abs(f.end - f.start);
            const seqLength = (Math.max(1, Math.floor(range / f.step) + 1)) * f.copies;
            if (!f.repeat) {
                totalPagesNeeded = Math.max(totalPagesNeeded, seqLength);
                anyNonRepeat = true;
            }
        });

        if (!anyNonRepeat) {
            numberingFields.forEach(f => {
                const range = Math.abs(f.end - f.start);
                const seqLength = (Math.max(1, Math.floor(range / f.step) + 1)) * f.copies;
                totalPagesNeeded = Math.max(totalPagesNeeded, seqLength);
            });
        }

        if (totalPagesNeeded <= 0) totalPagesNeeded = 1; // Fallback

        const cssWidth = canvasWrapper.clientWidth;
        const cssHeight = canvasWrapper.clientHeight;
        const pdfWidth = originalPdfWidth;
        const pdfHeight = originalPdfHeight;

        const scaleX = pdfWidth / cssWidth;
        const scaleY = pdfHeight / cssHeight;

        // Embed the template once and draw it on every page to save massive amounts of space
        for (let i = 0; i < totalPagesNeeded; i++) {
            const page = outPdf.addPage([pdfWidth, pdfHeight]);
            
            if (isEmbeddedImage) {
                page.drawImage(embeddedTemplate, {
                    x: 0,
                    y: 0,
                    width: pdfWidth,
                    height: pdfHeight,
                });
            } else {
                page.drawPage(embeddedTemplate, {
                    x: 0,
                    y: 0,
                    width: pdfWidth,
                    height: pdfHeight,
                });
            }

            for (const f of numberingFields) {
                const pageIndex = i + 1;
                const range = Math.abs(f.end - f.start);
                const seqLength = (Math.max(1, Math.floor(range / f.step) + 1)) * f.copies;
                let currentValue = null;
                
                const isReverse = f.start > f.end;
                const actualStep = isReverse ? -Math.abs(f.step) : Math.abs(f.step);
                
                let stepIndex = Math.floor((pageIndex - 1) / f.copies);
                
                if (f.repeat) {
                    let maxSteps = seqLength / f.copies;
                    currentValue = f.start + ((stepIndex % maxSteps) * actualStep);
                } else {
                    if (pageIndex <= seqLength) {
                        currentValue = f.start + (stepIndex * actualStep);
                    }
                }

                    if (currentValue !== null) {
                    const text = formatNumber(currentValue, f);

                    const customFont = await getPdfFont('Cairo', outPdf);

                    // Base PDF scaling coordinates
                    // f.x/y is the anchor of the text element in CSS.
                    const cssAnchorX = f.x;
                    const cssAnchorY = f.y;

                    // We need to approximate dimensions of the block in PDF points
                    const pFontSize = f.fontSize * scaleY;
                    const textWidth = customFont.widthOfTextAtSize(text, pFontSize);
                    const textHeight = customFont.heightAtSize(pFontSize);

                    const pPaddingX = f.padding * scaleX;
                    const pPaddingY = f.padding * scaleY;
                    const pBorderWidth = f.borderWidth * scaleX; // approx

                    const boxWidth = textWidth + (pPaddingX * 2);
                    const boxHeight = textHeight + (pPaddingY * 2);

                    // Since CSS position is centered vertically, and horizontally depends on alignment
                    const pdfAnchorX = cssAnchorX * scaleX;
                    const pdfAnchorY = pdfHeight - (cssAnchorY * scaleY);
                    
                    let rectX;
                    if (f.alignment === 'left') {
                        rectX = pdfAnchorX;
                    } else if (f.alignment === 'right') {
                        rectX = pdfAnchorX - boxWidth;
                    } else { // center
                        rectX = pdfAnchorX - (boxWidth / 2);
                    }

                    const rectY = pdfAnchorY - (boxHeight / 2);
                    
                    // Apply Rotation Math
                    const angle = -f.rotation * Math.PI / 180;
                    const cx = rectX + boxWidth / 2;
                    const cy = rectY + boxHeight / 2;
                    
                    const dx = -boxWidth / 2;
                    const dy = -boxHeight / 2;
                    const rotatedRectX = cx + dx * Math.cos(angle) - dy * Math.sin(angle);
                    const rotatedRectY = cy + dx * Math.sin(angle) + dy * Math.cos(angle);
                    
                    const textDx = (rectX + pPaddingX) - cx;
                    const textDy = (rectY + pPaddingY + (textHeight * 0.2)) - cy;
                    const rotatedTextX = cx + textDx * Math.cos(angle) - textDy * Math.sin(angle);
                    const rotatedTextY = cy + textDx * Math.sin(angle) + textDy * Math.cos(angle);
                    
                    const pdfRotation = PDFLib.degrees(-f.rotation);

                    const txtColorObj = hexToRgbStruct(f.textColor);
                    const bgColorObj = hexToRgbStruct(f.bgColor);
                    const borderColorObj = hexToRgbStruct(f.borderColor);

                    // Draw Background
                    if (f.bgEnabled) {
                        page.drawRectangle({
                            x: rotatedRectX,
                            y: rotatedRectY,
                            width: boxWidth,
                            height: boxHeight,
                            color: rgb(bgColorObj.r, bgColorObj.g, bgColorObj.b),
                            borderWidth: f.borderWidth > 0 ? pBorderWidth : 0,
                            borderColor: rgb(borderColorObj.r, borderColorObj.g, borderColorObj.b),
                            rotate: pdfRotation
                        });
                    } else if (f.borderWidth > 0) {
                        // Draw just the border (transparent inside)
                        page.drawRectangle({
                            x: rotatedRectX,
                            y: rotatedRectY,
                            width: boxWidth,
                            height: boxHeight,
                            borderWidth: pBorderWidth,
                            borderColor: rgb(borderColorObj.r, borderColorObj.g, borderColorObj.b),
                            rotate: pdfRotation
                        });
                    }

                    // Draw text
                    page.drawText(text, {
                        x: rotatedTextX,
                        y: rotatedTextY,
                        size: pFontSize,
                        font: customFont,
                        color: rgb(txtColorObj.r, txtColorObj.g, txtColorObj.b),
                        rotate: pdfRotation
                    });
                }
            } // end loop over fields
        }

        const pdfBytes = await outPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        
        const baseName = originalFileName.replace(/\.[^/.]+$/, "");
        a.download = `${baseName}_numbered_${yyyy}_${mm}_${dd}_${hh}_${min}.pdf`;
        
        a.click();
        URL.revokeObjectURL(url);

    } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء إنشاء الملف النهائي: ' + err.message);
    } finally {
        hideLoading();
    }
});

function showLoading(text) {
    loadingText.textContent = text;
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

// === Reset Functionality ===
resetBtn.addEventListener('click', () => {
    if (!confirm('هل أنت متأكد من مسح الملف الحالي والبدء من جديد؟')) return;

    // Clear State
    loadedFileBuffer = null;
    loadedFileType = '';
    numberingFields = [];
    fieldIdCounter = 0;

    // Clear UI
    fieldsContainer.innerHTML = '';
    overlayContainer.innerHTML = '';

    const ctx = pdfPreview.getContext('2d');
    ctx.clearRect(0, 0, pdfPreview.width, pdfPreview.height);

    // Reset Views
    dropzone.classList.remove('hidden');
    previewArea.classList.add('hidden');
    sidebar.setAttribute('aria-disabled', 'true');
    addNumberBtn.disabled = true;
    generateBtn.disabled = true;
    resetBtn.disabled = true;
    fileInput.value = '';
});
