class LaminarioApp {
    constructor() {
        this.pages = [];
        this.zoomLevel = 1;
        this.activeImageFrame = null;
        this.cropper = null;

        this.init();
    }

    init() {
        // Elements
        this.themeSelector = document.getElementById('theme-selector');
        this.shapeSelector = document.getElementById('shape-selector');
        this.bgColorPicker = document.getElementById('bg-color-picker');
        this.panelColorPicker = document.getElementById('panel-color-picker');
        this.accentColorPicker = document.getElementById('accent-color-picker');
        this.titleColorPicker = document.getElementById('title-color-picker');
        this.textColorPicker = document.getElementById('text-color-picker');
        this.frameColorPicker = document.getElementById('frame-color-picker');
        this.fontSizeSlider = document.getElementById('font-size-slider');
        this.fontSizeVal = document.getElementById('font-size-val');

        this.zoomDisplay = document.getElementById('zoom-level');
        this.documentPreview = document.getElementById('document-preview');
        this.pagesListEl = document.getElementById('pages-list');

        // Modal & Cropper
        this.cropperModal = document.getElementById('cropper-modal');
        this.cropperImage = document.getElementById('cropper-image');

        // File input creation logic
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = 'image/*';
        this.fileInput.onchange = this.handleFileSelect.bind(this);

        this.setupEventListeners();

        // Add default pages
        this.addPage('capa');
        this.addPage('sumario');
        this.addPage('lamina-1img');

        // Sortable JS setup for the Sidebar List
        new Sortable(this.pagesListEl, {
            animation: 150,
            handle: '.fa-grip-vertical',
            onEnd: (evt) => {
                this.reorderPages(evt.oldIndex, evt.newIndex);
            }
        });
    }

    setupEventListeners() {
        this.themeSelector.addEventListener('change', (e) => {
            document.body.setAttribute('data-theme', e.target.value);
            document.body.style.removeProperty('--page-bg');
            document.body.style.removeProperty('--page-panel');
            document.body.style.removeProperty('--page-accent');
            document.body.style.removeProperty('--page-text');
            document.body.style.removeProperty('--page-title');
            document.body.style.removeProperty('--page-frame');
        });

        this.bgColorPicker.addEventListener('input', (e) => {
            document.body.style.setProperty('--page-bg', e.target.value);
        });

        this.panelColorPicker.addEventListener('input', (e) => {
            document.body.style.setProperty('--page-panel', e.target.value);
        });

        this.accentColorPicker.addEventListener('input', (e) => {
            document.body.style.setProperty('--page-accent', e.target.value);
        });

        this.titleColorPicker.addEventListener('input', (e) => {
            document.body.style.setProperty('--page-title', e.target.value);
        });

        this.frameColorPicker.addEventListener('input', (e) => {
            document.body.style.setProperty('--page-frame', e.target.value);
        });

        this.textColorPicker.addEventListener('input', (e) => {
            document.body.style.setProperty('--page-text', e.target.value);
        });

        this.fontSizeSlider.addEventListener('input', (e) => {
            const size = e.target.value + 'px';
            this.fontSizeVal.innerText = size;
            document.documentElement.style.setProperty('--base-font-size', size);
        });

        window.addEventListener('resize', () => this.setAutoZoom());
        // Initialize mobile zoom if needed
        setTimeout(() => this.setAutoZoom(), 100);

        this.shapeSelector.addEventListener('change', (e) => {
            const shape = e.target.value;
            // Clear all possible override classes first
            const classesToRemove = ['shape-circle', 'shape-square', 'shape-rounded', 'shape-diamond', 'shape-hexagon', 'shape-pentagon', 'shape-slanted'];
            classesToRemove.forEach(c => document.body.classList.remove(c));

            if (shape !== 'default') {
                document.body.classList.add(`shape-${shape}`);
            }
        });
    }

    zoom(delta) {
        this.zoomLevel += delta;
        if (this.zoomLevel < 0.3) this.zoomLevel = 0.3;
        if (this.zoomLevel > 2) this.zoomLevel = 2;

        document.documentElement.style.setProperty('--zoom', this.zoomLevel);
        this.zoomDisplay.innerText = Math.round(this.zoomLevel * 100) + '%';
    }

    setAutoZoom() {
        if (window.innerWidth <= 768) {
            const container = document.querySelector('.preview-container');
            if (!container) return;
            // A4 is ~794px wide. Calculate ideal zoom.
            const width = container.clientWidth;
            const targetZoom = width < 834 ? (width - 40) / 794 : 1;
            
            this.zoomLevel = targetZoom;
            document.documentElement.style.setProperty('--zoom', this.zoomLevel);
            if (this.zoomDisplay) this.zoomDisplay.innerText = Math.round(this.zoomLevel * 100) + '%';
        }
    }

    generateId() {
        return 'page-' + Math.random().toString(36).substr(2, 9);
    }

    addPage(type) {
        const id = this.generateId();
        const page = { id, type };
        this.pages.push(page);
        this.renderPages();
        // Delay scroll slightly to ensure render is complete
        setTimeout(() => this.scrollToPage(id), 100);
    }

    removePage(id) {
        // Prevent deleting the very last page
        if (this.pages.length <= 1) return;
        this.pages = this.pages.filter(p => p.id !== id);
        this.renderPages();
    }

    reorderPages(oldIndex, newIndex) {
        const [movedPage] = this.pages.splice(oldIndex, 1);
        this.pages.splice(newIndex, 0, movedPage);
        this.renderPages();
    }

    getPageNames(type) {
        const names = {
            'capa': 'Capa Principal',
            'sumario': 'Sumário',
            'lamina-1img': '1 Lâmina + Texto',
            'lamina-2img': '2 Lâminas Comparativas',
            'lamina-3img': 'Tripla Comparação',
            'lamina-4img': 'Painel Multimídia (4 Lâminas)'
        };
        return names[type];
    }

    renderPages() {
        // Clear sidebar list current elements
        this.pagesListEl.innerHTML = '';

        const previewFragment = document.createDocumentFragment();
        const activeIds = new Set();

        this.pages.forEach((page, index) => {
            let pageNum = index + 1;

            // Build Sidebar List Item
            const li = document.createElement('li');
            li.className = 'page-item';
            li.innerHTML = `
                <div class="page-item-title" onclick="app.scrollToPage('${page.id}')">
                    <i class="fas fa-grip-vertical"></i> 
                    <span>${pageNum}. ${this.getPageNames(page.type)}</span>
                </div>
                <div class="page-item-actions">
                    <button onclick="app.removePage('${page.id}')" title="Excluir Página"><i class="fas fa-trash"></i></button>
                </div>
            `;
            this.pagesListEl.appendChild(li);

            // We will fetch or create docPage at the end of the loop to preserve state

            const decorHtml = `
                <div class="theme-decorations">
                    <!-- Caderno Histológico Decor -->
                    <div class="decor-band"></div>

                    <!-- Resident Evil Decor -->
                    <div class="re-blood-splatter"></div>
                    <div class="re-scratch re-scratch-1"></div>
                    <div class="re-scratch re-scratch-2"></div>
                    
                    <!-- Clair Obscur Decor -->
                    <div class="co-petals"></div>
                    <div class="co-vignette"></div>

                    <!-- Pokemon Decor -->
                    <div class="pk-stripe pk-red"></div>
                    <div class="pk-stripe pk-white"></div>

                    <!-- Silksong Decor -->
                    <div class="ss-embers"></div>
                    <div class="ss-vignette"></div>

                    <!-- Hexatombe Decor -->
                    <div class="hx-grunge"></div>
                    <div class="hx-blood-splatter"></div>
                    <div class="hx-vignette"></div>

                    <!-- Sinais do Outro Lado Decor -->
                    <div class="sn-swirl"></div>
                    <div class="sn-glitch"></div>
                    <div class="sn-vignette"></div>
                </div>
            `;

            let contentHtml = page.html || '';

            if (!page.html && page.type === 'capa') {
                contentHtml = `
                    <div class="page-content page-capa">
                        <div class="university-header" style="display:flex; flex-direction:column; align-items:center; gap:20px;">
                            <div class="uni-logo-frame img-frame" style="width: 140px; height: 140px; border-radius: 10px; cursor: pointer;" onclick="app.triggerImageUpload(this)">
                                <img src="" alt="" style="display:none;">
                            </div>
                            <div class="uni-name" contenteditable="true" style="text-align: center; font-weight: 700; font-size: 1.1rem; line-height: 1.4;">UNIVERSIDADE FEDERAL DE CAMPINA GRANDE<br>CENTRO DE CIÊNCIAS BIOLÓGICAS E DA SAÚDE<br>UNIDADE ACADÊMICA DE MEDICINA</div>
                        </div>
                        
                        <div class="title-group" style="margin: 60px 0;">
                            <div class="title" contenteditable="true" style="font-weight: 600; font-size: 4rem; line-height: 1; letter-spacing: -1.5px;">Relatório<br>Histológico</div>
                            <div class="subtitle" contenteditable="true" style="font-size: 2.2rem; font-weight: 300;">Sistema Locomotor</div>
                        </div>

                        <div class="author-info" style="display:flex; flex-direction:column; gap:5px; margin-top: auto; font-size: 1.15rem; line-height: 1.4;">
                            <div contenteditable="true">Discente: [Nome do Aluno]</div>
                            <div contenteditable="true">Matrícula: [000000000]</div>
                            <div contenteditable="true">Docente: [Nome do Professor]</div>
                            <div contenteditable="true">Curso: [Nome do Curso]</div>
                            <div contenteditable="true">Disciplina: [Nome da Disciplina]</div>
                        </div>
                        
                        <div class="footer-city" contenteditable="true" style="margin-top: 50px; font-weight: 500; font-size: 1.1rem; text-align: center;">Campina Grande, PB</div>
                    </div>
                `;
            } else if (!page.html && page.type === 'sumario') {
                contentHtml = `
                    <div class="page-content page-sumario">
                        <h2 contenteditable="true">Sumário</h2>
                        <ul class="toc-list">
                            <li class="toc-item"><span contenteditable="true">Tecido Epitelial de Revestimento</span> <span contenteditable="true">03</span></li>
                            <li class="toc-item"><span contenteditable="true">Tecido Conjuntivo Propriamente Dito</span> <span contenteditable="true">04</span></li>
                            <li class="toc-item"><span contenteditable="true">Tecido Muscular Esquelético</span> <span contenteditable="true">06</span></li>
                            <li class="toc-item"><span contenteditable="true">Tecido Nervoso</span> <span contenteditable="true">08</span></li>
                            <li class="toc-item"><span contenteditable="true">[Adicionar Novo Tópico...]</span> <span contenteditable="true">XX</span></li>
                        </ul>
                    </div>
                `;
            } else if (!page.html && page.type === 'lamina-1img') {
                contentHtml = `
                    <div class="page-content lamina-layout-1img">
                        <div class="page-header">
                            <h2 contenteditable="true">Nome do Tecido/Lâmina</h2>
                        </div>
                        <div class="layout-grid">
                            <div class="main-content">
                                <div class="image-container">
                                    <div class="img-frame" onclick="app.triggerImageUpload(this)">
                                        <img src="" alt="" style="display:none;">
                                    </div>
                                    <div class="image-caption" contenteditable="true">Coloração: HE | Aumento: 400x</div>
                                </div>
                                <div class="text-area">
                                    <p contenteditable="true">Descreva as características principais desta lâmina. Aponte as estruturas observadas, os tipos celulares predominantes e quaisquer arranjos teciduais específicos que caracterizam o corte. Você pode editar todo este espaço com suas anotações.</p>
                                </div>
                            </div>
                        </div>
                        <div class="page-number">${pageNum}</div>
                    </div>
                `;
            } else if (!page.html && page.type === 'lamina-2img') {
                contentHtml = `
                    <div class="page-content lamina-layout-2img">
                        <div class="page-header">
                            <h2 contenteditable="true">Comparação Histológica</h2>
                        </div>
                        <div class="layout-grid">
                            <div class="main-content">
                                <div class="image-container">
                                    <div class="img-frame" onclick="app.triggerImageUpload(this)">
                                        <img src="" alt="" style="display:none;">
                                    </div>
                                    <div class="image-caption" contenteditable="true">Lâmina A (Ex: Corte Transversal)</div>
                                </div>
                                <div class="image-container">
                                    <div class="img-frame" onclick="app.triggerImageUpload(this)">
                                        <img src="" alt="" style="display:none;">
                                    </div>
                                    <div class="image-caption" contenteditable="true">Lâmina B (Ex: Corte Longitudinal)</div>
                                </div>
                            </div>
                            <div class="text-area">
                                <p contenteditable="true">Utilize este espaço para comparar as duas fotomicrografias. Destaque as diferenças morfológicas, as preparações ou colorações distintas utilizadas, e como cada corte evidencia estruturas singulares do tecido estudado.</p>
                            </div>
                        </div>
                        <div class="page-number">${pageNum}</div>
                    </div>
                `;
            } else if (!page.html && page.type === 'lamina-3img') {
                contentHtml = `
                    <div class="page-content lamina-layout-3img">
                        <div class="page-header">
                            <h2 contenteditable="true">Tripla Comparação</h2>
                        </div>
                        <div class="layout-grid">
                            <div class="main-content">
                                <div class="image-container">
                                    <div class="img-frame" onclick="app.triggerImageUpload(this)">
                                        <img src="" alt="" style="display:none;">
                                    </div>
                                    <div class="image-caption" contenteditable="true">Visão Panorâmica (Objetiva 10x)</div>
                                </div>
                                <div class="image-container">
                                    <div class="img-frame" onclick="app.triggerImageUpload(this)">
                                        <img src="" alt="" style="display:none;">
                                    </div>
                                    <div class="image-caption" contenteditable="true">Detalhe B</div>
                                </div>
                                <div class="image-container">
                                    <div class="img-frame" onclick="app.triggerImageUpload(this)">
                                        <img src="" alt="" style="display:none;">
                                    </div>
                                    <div class="image-caption" contenteditable="true">Detalhe C</div>
                                </div>
                            </div>
                            <div class="text-area">
                                <p contenteditable="true">Descreva a relação entre as amostras fotomicrografadas acima e as transições celulares entre elas.</p>
                            </div>
                        </div>
                        <div class="page-number">${pageNum}</div>
                    </div>
                `;
            } else if (!page.html && page.type === 'lamina-4img') {
                contentHtml = `
                    <div class="page-content lamina-layout-4img">
                        <div class="page-header" style="margin-bottom: 25px;">
                            <h2 contenteditable="true">Painel Multimídia</h2>
                        </div>
                        <div class="layout-grid" style="gap: 20px;">
                            <div class="main-content">
                                <div class="image-container">
                                    <div class="img-frame" onclick="app.triggerImageUpload(this)">
                                        <img src="" alt="" style="display:none;">
                                    </div>
                                    <div class="image-caption" contenteditable="true">Amostra A</div>
                                </div>
                                <div class="image-container">
                                    <div class="img-frame" onclick="app.triggerImageUpload(this)">
                                        <img src="" alt="" style="display:none;">
                                    </div>
                                    <div class="image-caption" contenteditable="true">Amostra B</div>
                                </div>
                                <div class="image-container">
                                    <div class="img-frame" onclick="app.triggerImageUpload(this)">
                                        <img src="" alt="" style="display:none;">
                                    </div>
                                    <div class="image-caption" contenteditable="true">Amostra C</div>
                                </div>
                                <div class="image-container">
                                    <div class="img-frame" onclick="app.triggerImageUpload(this)">
                                        <img src="" alt="" style="display:none;">
                                    </div>
                                    <div class="image-caption" contenteditable="true">Amostra D</div>
                                </div>
                            </div>
                            <div class="text-area" style="font-size: 1.05rem; margin-top: 0;">
                                <p contenteditable="true">Síntese geral do painel. Descreva os principais achados.</p>
                            </div>
                        </div>
                        <div class="page-number">${pageNum}</div>
                    </div>
                `;
            } // End of if/else logic for contentHtml

            let docPage = document.getElementById(page.id);
            if (!docPage) {
                // Not in DOM, create from scratch
                docPage = document.createElement('div');
                docPage.className = 'doc-page type-' + page.type;
                docPage.id = page.id;
                docPage.innerHTML = decorHtml + contentHtml;
            }

            // Update page number dynamically for both existing and new pages
            const pageNumEl = docPage.querySelector('.page-number');
            if (pageNumEl) {
                pageNumEl.innerText = pageNum;
            }

            activeIds.add(page.id);
            previewFragment.appendChild(docPage); // This moves the existing element instead of duplicating
        }); // End of this.pages.forEach

        // 1. Remove deleted nodes from DOM
        Array.from(this.documentPreview.children).forEach(child => {
            if (!activeIds.has(child.id)) {
                this.documentPreview.removeChild(child);
            }
        });

        // 2. Append the ordered fragments
        this.documentPreview.appendChild(previewFragment);
    }

    scrollToPage(id) {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Highlight list item
            document.querySelectorAll('.page-item').forEach(item => item.classList.remove('active'));
            const index = this.pages.findIndex(p => p.id === id);
            if (index !== -1 && this.pagesListEl.children[index]) {
                this.pagesListEl.children[index].classList.add('active');
            }
        }
    }

    triggerImageUpload(frameDiv) {
        this.activeImageFrame = frameDiv;
        this.fileInput.click();
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            // If the active frame is the university logo, skip cropper entirely
            // This preserves PNG transparency and original proportions
            if (this.activeImageFrame && this.activeImageFrame.classList.contains('uni-logo-frame')) {
                const imgEl = this.activeImageFrame.querySelector('img');
                imgEl.src = event.target.result;
                imgEl.style.display = 'block';
                imgEl.style.objectFit = 'contain';
                imgEl.style.width = '100%';
                imgEl.style.height = '100%';
                this.activeImageFrame.classList.add('has-image');
                this.activeImageFrame.style.background = 'transparent';
                this.activeImageFrame.style.border = 'none';
                this.activeImageFrame.style.boxShadow = 'none';
                return;
            }
            this.openCropper(event.target.result);
        };
        reader.readAsDataURL(file);

        // Reset input to allow selecting the same file again
        this.fileInput.value = '';
    }

    openCropper(imageSrc) {
        this.cropperImage.src = imageSrc;
        this.cropperModal.classList.add('active');

        // Give time for modal to display so Cropper can calculate dimensions
        setTimeout(() => {
            if (this.cropper) {
                this.cropper.destroy();
            }

            // The cropper view is rounded via CSS in styles.css
            // Aspect Ratio 1 ensures crop results in a square, which becomes a circle due to border-radius.
            this.cropper = new Cropper(this.cropperImage, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.9,
                restore: false,
                guides: false,
                center: false,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        }, 100);
    }

    closeCropper() {
        this.cropperModal.classList.remove('active');
        if (this.cropper) {
            setTimeout(() => {
                this.cropper.destroy();
                this.cropper = null;
            }, 300);
        }
    }

    applyCrop() {
        if (!this.cropper || !this.activeImageFrame) return;

        // Get cropped canvas
        const canvas = this.cropper.getCroppedCanvas({
            width: 800,
            height: 800,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

        const imgEl = this.activeImageFrame.querySelector('img');
        imgEl.src = dataUrl;
        imgEl.style.display = 'block';

        this.activeImageFrame.classList.add('has-image');

        this.closeCropper();
    }

    exportPDF() {
        const element = this.documentPreview;

        const opt = {
            margin: 0,
            filename: 'Uiusas_Laminario.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0, backgroundColor: null },
            jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait', hotfixes: ["px_scaling"] }
        };

        const exportBtn = document.querySelector('.export-btn');
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando PDF...';

        // Prepare document for printing: 
        // 1. Reset zoom securely without breaking state
        const originalDocZoom = document.documentElement.style.getPropertyValue('--zoom');
        document.documentElement.style.setProperty('--zoom', '1');

        // 2. Remove gap, padding and shadows to prevent page-break offsets in html2pdf
        const originalGap = element.style.gap;
        const originalPadding = element.style.padding;
        const originalBgColor = element.style.backgroundColor;

        element.style.gap = '0px';
        element.style.padding = '0px';

        // Force the background color of the container to match the CSS variable, preventing html2canvas alpha layer bugs
        const computedBg = getComputedStyle(document.body).getPropertyValue('--page-bg').trim() || '#ffffff';
        element.style.backgroundColor = computedBg;

        const pages = element.querySelectorAll('.doc-page');
        const originalShadows = [];
        pages.forEach((p, i) => {
            originalShadows[i] = p.style.boxShadow;
            p.style.boxShadow = 'none';
        });

        // 3. Disable editing to remove carets/hover effects during print
        const editables = document.querySelectorAll('[contenteditable="true"]');
        editables.forEach(el => el.setAttribute('contenteditable', 'false'));

        // Brief timeout to ensure DOM paints the zero-gap before capture
        setTimeout(() => {
            html2pdf().set(opt).from(element).save().then(() => {
                exportBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Exportar PDF';

                // Restore all properties
                document.documentElement.style.setProperty('--zoom', originalDocZoom);
                element.style.gap = originalGap;
                element.style.padding = originalPadding;
                element.style.backgroundColor = originalBgColor;

                pages.forEach((p, i) => {
                    p.style.boxShadow = originalShadows[i];
                });

                // Re-enable editing
                editables.forEach(el => el.setAttribute('contenteditable', 'true'));
            });
        }, 300);
    }

    exportJSON() {
        this.syncDOMtoState();

        const projectData = {
            theme: this.themeSelector.value,
            shape: this.shapeSelector.value,
            customColors: {
                bg: this.bgColorPicker.value,
                panel: this.panelColorPicker.value,
                accent: this.accentColorPicker.value,
                title: this.titleColorPicker.value,
                text: this.textColorPicker.value,
                frame: this.frameColorPicker.value
            },
            fontSize: this.fontSizeSlider.value,
            pages: this.pages
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "meu-laminario.json");
        dlAnchorElem.click();
    }

    importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const projectData = JSON.parse(e.target.result);
                
                if (projectData.theme) {
                    this.themeSelector.value = projectData.theme;
                    this.themeSelector.dispatchEvent(new Event('change'));
                }
                if (projectData.shape) {
                    this.shapeSelector.value = projectData.shape;
                    this.shapeSelector.dispatchEvent(new Event('change'));
                }
                if (projectData.customColors) {
                    this.bgColorPicker.value = projectData.customColors.bg;
                    this.panelColorPicker.value = projectData.customColors.panel;
                    this.accentColorPicker.value = projectData.customColors.accent;
                    this.titleColorPicker.value = projectData.customColors.title;
                    this.textColorPicker.value = projectData.customColors.text;
                    this.frameColorPicker.value = projectData.customColors.frame;
                    
                    ['bg', 'panel', 'accent', 'title', 'text', 'frame'].forEach(id => {
                        this[id + 'ColorPicker'].dispatchEvent(new Event('input'));
                    });
                }
                if (projectData.fontSize) {
                    this.fontSizeSlider.value = projectData.fontSize;
                    this.fontSizeSlider.dispatchEvent(new Event('input'));
                }

                if (projectData.pages && Array.isArray(projectData.pages)) {
                    this.pages = projectData.pages;
                    this.renderPages();
                }
            } catch (err) {
                alert('Erro ao carregar o projeto. O arquivo pode estar corrompido.');
                console.error(err);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    syncDOMtoState() {
        const pageElements = this.documentPreview.querySelectorAll('.doc-page');
        pageElements.forEach((el, index) => {
            if (this.pages[index]) {
                const pageContent = el.querySelector('.page-content');
                if (pageContent) {
                    this.pages[index].html = pageContent.outerHTML;
                }
            }
        });
    }

    generateTOC() {
        this.syncDOMtoState();
        
        const tocItems = [];
        let pageNumCounter = 1;
        
        const pageElements = this.documentPreview.querySelectorAll('.doc-page');
        pageElements.forEach((pageEl, index) => {
            const pageData = this.pages[index];
            if (pageData && pageData.type.startsWith('lamina')) {
                const titleEl = pageEl.querySelector('.page-header h2');
                const title = titleEl ? titleEl.innerText.trim() : 'Sem Título';
                const numEl = pageEl.querySelector('.page-number');
                let pageNumStr = numEl ? numEl.innerText.trim() : String(pageNumCounter).padStart(2, '0');
                
                tocItems.push({ title, pageNum: pageNumStr });
            }
            pageNumCounter++;
        });

        if (tocItems.length === 0) {
            alert("Nenhuma lâmina encontrada para gerar o sumário. Adicione lâminas primeiro.");
            return;
        }

        this.pages = this.pages.filter(p => !p.type.startsWith('sumario'));

        const CHUNK_SIZE = 15;
        const chunks = [];
        for (let i = 0; i < tocItems.length; i += CHUNK_SIZE) {
            chunks.push(tocItems.slice(i, i + CHUNK_SIZE));
        }

        const capaIndex = this.pages.findIndex(p => p.type === 'capa');
        const insertIndex = capaIndex !== -1 ? capaIndex + 1 : 0;

        const newSumarioPages = chunks.map((chunk, idx) => {
            const listHtml = chunk.map(item => `
                <li class="toc-item">
                    <span contenteditable="true">${item.title}</span> 
                    <span contenteditable="true">${item.pageNum}</span>
                </li>
            `).join('');

            return {
                id: 'sumario_' + Date.now() + '_' + idx,
                type: 'sumario',
                html: `
                    <div class="page-content page-sumario">
                        <h2 contenteditable="true">Sumário ${chunks.length > 1 ? `(Parte ${idx + 1})` : ''}</h2>
                        <ul class="toc-list">
                            ${listHtml}
                        </ul>
                    </div>
                `
            };
        });

        this.pages.splice(insertIndex, 0, ...newSumarioPages);
        this.renderPages();
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LaminarioApp();
});
