// --- Script para Geração de CV em PDF (Versão 5.6 - Correções Finais de Layout) ---
(function() {

    // --- Funções Auxiliares de Geração de PDF ---

    /**
     * Verifica se é necessário adicionar uma nova página.
     */
    function checkPageBreak(doc, context, neededHeight) {
        if (context.y + neededHeight > doc.internal.pageSize.getHeight() - context.margin) {
            doc.addPage();
            context.y = context.margin;
        }
    }

    /**
     * Adiciona um título de seção formatado, conforme o exemplo.
     */
    function addSectionTitle(doc, title, context) {
        context.y += (context.y > context.margin + 20) ? 25 : 5;
        checkPageBreak(doc, context, 40);

        doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor('#0f172a');
        doc.text(title.toUpperCase(), context.margin, context.y);
        context.y += 8;

        doc.setLineWidth(1);
        doc.setDrawColor('#10b981'); // Cor verde do site
        doc.line(context.margin, context.y, context.page_width - context.margin, context.y);
        context.y += 20;
    }

    /**
     * Adiciona texto, tratando parágrafos (separados por \n) e justificando corretamente.
     */
    function addJustifiedText(doc, content, context, options = {}) {
        const {
            fontSize = 10,
            fontStyle = 'normal',
            color = 80,
            x = context.margin,
            width = context.max_width,
            align = 'justify'
        } = options;

        if (!content) return;
        
        const paragraphs = content.split('\n').filter(p => p.trim() !== '');

        paragraphs.forEach((paragraph, index) => {
            const lines = doc.splitTextToSize(paragraph.trim(), width);
            const textHeight = lines.length * (fontSize * 1.2);
            checkPageBreak(doc, context, textHeight);

            doc.setFontSize(fontSize).setFont('helvetica', fontStyle).setTextColor(color);
            doc.text(lines, x, context.y, { align: align, maxWidth: width });
            
            context.y += textHeight;
            if (index < paragraphs.length - 1) {
                context.y += (fontSize * 0.5);
            }
        });
        
        context.y += (fontSize * 0.5);
    }
    
    /**
     * Adiciona um item de lista com título em negrito e descrição justificada.
     */
    function addListItem(doc, title, description, context) {
        checkPageBreak(doc, context, 40);
        
        const titleText = `• ${title}`;
        const titleLines = doc.splitTextToSize(titleText, context.max_width);
        const titleHeight = titleLines.length * 12;

        checkPageBreak(doc, context, titleHeight);
        doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(0);
        doc.text(titleLines, context.margin, context.y);
        context.y += titleHeight;

        if (description) {
            context.y += 2; // Pequeno espaço
            addJustifiedText(doc, description, context, { x: context.margin + 10, width: context.max_width - 10 });
        }
        context.y += 8;
    }


    // --- Função Principal de Geração ---

    async function generateCvPdf() {
        const button = document.getElementById('download-cv-btn');
        const toast = document.getElementById('toast-notification');
        const originalButtonHTML = button.innerHTML;

        const showError = (message) => {
            console.error(message);
            if (toast) {
                toast.textContent = message;
                toast.style.backgroundColor = '#f44336';
                toast.classList.add('show');
                setTimeout(() => { toast.classList.remove('show'); toast.style.backgroundColor = ''; }, 4000);
            }
        };

        if (typeof window.jspdf === 'undefined' || typeof translations === 'undefined' || !translations[currentLang]) {
            showError('Erro: Dependências não carregadas.');
            return;
        }

        button.innerHTML = `<svg class="animate-spin" style="width: 20px; height: 20px; display: inline-block; margin-right: 8px;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.75V6.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M17.1266 6.87347L16.0659 7.93413" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M19.25 12L17.75 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M17.1266 17.1265L16.0659 16.0659" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 17.75V19.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M6.87344 17.1265L7.9341 16.0659" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4.75 12L6.25 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M6.87344 6.87347L7.9341 7.93413" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg> <span>Gerando...</span>`;
        button.disabled = true;
        if (toast) { toast.textContent = 'Preparando seu currículo...'; toast.classList.add('show'); }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'pt', 'a4');
            const context = {
                y: 40,
                margin: 40,
                page_width: doc.internal.pageSize.getWidth(),
                page_height: doc.internal.pageSize.getHeight(),
                max_width: doc.internal.pageSize.getWidth() - 80
            };
            
            const allPdfStrings = { ...(translations[currentLang] || {}), ...(translations[currentLang]?.pdf || {}) };

            // --- HEADER ---
            let avatarDataUrl = null;
            try {
                const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(document.querySelector('.avatar').src)}`);
                const blob = await response.blob();
                avatarDataUrl = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
                if (avatarDataUrl) doc.addImage(avatarDataUrl, 'JPEG', context.margin, context.y, 80, 80);
            } catch (e) { console.error("Falha ao carregar o avatar:", e); }
            
            doc.setFontSize(22).setFont('helvetica', 'bold').setTextColor(0).text(document.getElementById('hero-name').textContent, context.margin + 95, context.y + 25);
            doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(100).text("Viçosa - Minas Gerais - Brasil", context.margin + 95, context.y + 40);
            doc.text("Email: wevertonufv@gmail.com", context.margin + 95, context.y + 55);
            doc.setTextColor(40, 40, 255).textWithLink("LinkedIn: linkedin.com/in/wevertoncosta", context.margin + 95, context.y + 70, { url: 'https://linkedin.com/in/wevertoncosta' });
            context.y += 105;

            // --- SECTIONS ---
            addSectionTitle(doc, allPdfStrings['about-title'] || 'SOBRE MIM', context);
            const aboutText = Array.from(document.querySelectorAll('#sobre p')).map(p => p.innerText.trim()).join('\n\n');
            addJustifiedText(doc, aboutText, context, { align: 'justify' });

            addSectionTitle(doc, allPdfStrings['services-title'] || 'SERVIÇOS & CONSULTORIA', context);
            document.querySelectorAll('#servicos .card').forEach(card => addListItem(doc, card.querySelector('h3').innerText, card.querySelector('p').innerText, context));

            addSectionTitle(doc, allPdfStrings['skills-title'] || 'HABILIDADES TÉCNICAS', context);
            const skills = Array.from(document.querySelectorAll('.skill-name')).map(s => `• ${s.innerText.trim()}`);
            const midpoint = Math.ceil(skills.length / 2);
            doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(80);
            const col1 = skills.slice(0, midpoint);
            const col2 = skills.slice(midpoint);
            doc.text(col1, context.margin, context.y);
            doc.text(col2, context.page_width / 2, context.y);
            context.y += Math.max(col1.length, col2.length) * 14;

            addSectionTitle(doc, allPdfStrings['expertise-title'] || 'ÁREAS DE ESPECIALIZAÇÃO', context);
            document.querySelectorAll('#experiencia .card').forEach(card => {
                const title = `• ${card.querySelector('h3').innerText}:`;
                const description = card.querySelector('p').innerText;
                
                checkPageBreak(doc, context, 40);
                
                const initialY = context.y;
                doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(0);
                
                const titleLines = doc.splitTextToSize(title, context.max_width);
                doc.text(titleLines, context.margin, initialY);

                const yAfterTitle = initialY + (titleLines.length * 12);
                context.y = yAfterTitle;
                
                const descOptions = {
                    fontSize: 10,
                    fontStyle: 'normal',
                    color: 80,
                    align: 'justify'
                };

                if (titleLines.length > 1) {
                    descOptions.x = context.margin + 10;
                    descOptions.width = context.max_width - 10;
                } else {
                    const titleWidth = doc.getTextWidth(title);
                    descOptions.x = context.margin + titleWidth + 4;
                    descOptions.width = context.max_width - (titleWidth + 4);
                    context.y = initialY; // Volta para a linha do título
                }
                
                addJustifiedText(doc, description, context, descOptions);
                context.y += 10;
            });
            
            addSectionTitle(doc, allPdfStrings['education-title'] || 'FORMAÇÃO ACADÊMICA', context);
            document.querySelectorAll('#formacao .timeline-item').forEach(item => {
                checkPageBreak(doc, context, 80);
                const title = item.querySelector('h3').innerText;
                const date = item.querySelector('.timeline-date').innerText;
                const institution = item.querySelector('p:not(.small-muted)').innerText;
                const advisor = item.querySelector('p.small-muted')?.innerText || '';
                const details = item.querySelector('.timeline-details').innerText;

                doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(40).text(title, context.margin, context.y);
                context.y += 14;
                doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(100).text(date, context.margin, context.y);
                context.y += 14;
                doc.setFont('helvetica', 'italic').text(institution, context.margin, context.y);
                context.y += 14;
                if(advisor){
                    const advisorLines = doc.splitTextToSize(advisor, context.max_width);
                    doc.setFont('helvetica', 'normal').text(advisorLines, context.margin, context.y);
                    context.y += advisorLines.length * 14; // Altura dinâmica
                }
                addJustifiedText(doc, details, context, { fontSize: 9 });
                context.y += 5;
            });

            addSectionTitle(doc, allPdfStrings['projects-title'] || 'PRINCIPAIS PROJETOS', context);
            (window.githubScript?.allRepos || []).slice(0, 3).forEach(repo => addListItem(doc, repo.name, repo.description, context));
            doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(40, 40, 255);
            doc.textWithLink("Para mais projetos, acesse meu perfil no GitHub.", context.margin, context.y, { url: 'https://github.com/WevertonGomesCosta' });
            context.y += 20;
            
            addSectionTitle(doc, allPdfStrings['publications-title'] || 'PRINCIPAIS PUBLICAÇÕES', context);
            (window.scholarScript?.allArticles || []).slice(0, 3).forEach(art => {
                const citation = art.cited_by?.value ? `\nCitado ${art.cited_by.value} vezes` : '';
                addListItem(doc, art.title, `${art.publication}${citation}`, context);
            });
            doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(40, 40, 255);
            doc.textWithLink("Para mais publicações, acesse meu perfil no Google Scholar.", context.margin, context.y, { url: 'https://scholar.google.com.br/citations?hl=pt-BR&user=eJNKcHsAAAAJ' });
            context.y += 20;

            // --- SAVE ---
            doc.save('CV-Weverton_Gomes_da_Costa.pdf');
            if (toast) { toast.textContent = 'Download iniciado!'; toast.style.backgroundColor = ''; }

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            showError('Ocorreu um erro ao gerar o PDF.');
        } finally {
            button.innerHTML = originalButtonHTML;
            button.disabled = false;
            setTimeout(() => { if (toast) toast.classList.remove('show'); }, 3000);
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        const downloadBtn = document.getElementById('download-cv-btn');
        if (downloadBtn) downloadBtn.addEventListener('click', (e) => { e.preventDefault(); generateCvPdf(); });
    });
})();

