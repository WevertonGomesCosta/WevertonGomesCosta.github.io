// --- Script para Geração de CV em PDF (Versão 7.0 - Estrutura Refatorada) ---

(function() {
    /**
     * Remove tags HTML de uma string.
     * @param {string} html - A string contendo HTML.
     * @returns {string} A string sem as tags HTML.
     */
    function stripHtml(html) {
        if (!html) return "";
        let doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    }

    /**
     * Função principal que gera o currículo em PDF.
     */
    async function generateCvPdf() {
        const button = document.getElementById('download-cv-btn');
        const originalButtonHTML = button.innerHTML;
        const toast = document.getElementById('toast-notification');

        // --- 1. Preparar UI ---
        button.innerHTML = `<svg class="animate-spin" style="width: 20px; height: 20px; display: inline-block; margin-right: 8px;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.75V6.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M17.1266 6.87347L16.0659 7.93413" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M19.25 12L17.75 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M17.1266 17.1265L16.0659 16.0659" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 17.75V19.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M6.87344 17.1265L7.9341 16.0659" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4.75 12L6.25 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M6.87344 6.87347L7.9341 7.93413" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg> <span>Gerando...</span>`;
        button.disabled = true;
        if (toast) {
            toast.textContent = 'Preparando seu currículo...';
            toast.classList.add('show');
        }

        try {
            const { jsPDF } = window.jspdf;
            const langContent = translations[currentLang] || {};
            const pdfStrings = langContent.pdf || {};

            // --- 2. Inicializar PDF e definir layout ---
            const doc = new jsPDF('p', 'pt', 'a4');
            const page_width = doc.internal.pageSize.getWidth();
            const margin = 40;
            const max_width = page_width - margin * 2;
            let y = margin;

            const checkPageBreak = (neededHeight) => {
                if (y + neededHeight > doc.internal.pageSize.getHeight() - margin) {
                    doc.addPage();
                    y = margin;
                }
            };

            // --- 3. Buscar e converter imagem do Avatar ---
            let avatarDataUrl = null;
            try {
                const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(document.querySelector('.avatar').src)}`);
                const blob = await response.blob();
                avatarDataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.error("Não foi possível carregar a imagem do avatar:", e);
            }

            // --- 4. Adicionar Cabeçalho ---
            if (avatarDataUrl) {
                doc.addImage(avatarDataUrl, 'JPEG', margin, y, 80, 80);
            }
            doc.setFontSize(22).setFont('helvetica', 'bold').setTextColor(0).text(document.getElementById('hero-name').textContent, margin + 95, y + 25);
            doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(100).text("Viçosa - Minas Gerais - Brasil", margin + 95, y + 40);
            doc.text("Email: wevertonufv@gmail.com", margin + 95, y + 55);
            doc.setTextColor(40, 40, 255).textWithLink("LinkedIn: linkedin.com/in/wevertoncosta", margin + 95, y + 70, { url: 'https://linkedin.com/in/wevertoncosta' });
            y += 105;

            // --- 5. Funções Auxiliares para Seções ---
            const addSectionTitle = (title) => {
                y += (y > margin + 20) ? 25 : 5;
                checkPageBreak(40);
                doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor('#0f172a');
                doc.text(title.toUpperCase(), margin, y);
                y += 8;
                doc.setLineWidth(1);
                doc.setDrawColor('#10b981');
                doc.line(margin, y, page_width - margin, y);
                y += 20;
            };

            const addJustifiedText = (content, options = {}) => {
                const { fontSize = 10, x = margin, width = max_width } = options;
                if (!content || content.trim() === "") return;
                
                doc.setFontSize(fontSize).setFont('helvetica', 'normal').setTextColor(80);
                const cleanedContent = stripHtml(content).replace(/\s+/g, ' ').trim();
                const lines = doc.splitTextToSize(cleanedContent, width);
                const textHeight = lines.length * (fontSize * 1.2);
                checkPageBreak(textHeight);
                doc.text(lines, x, y, { align: 'justify', maxWidth: width });
                y += textHeight + 5;
            };
            
            // --- 6. Adicionar Seções do Currículo ---

            // SOBRE MIM
            addSectionTitle(pdfStrings['about-title'] || 'SOBRE MIM');
            addJustifiedText(langContent['about-p1']);
            addJustifiedText(langContent['about-p2']);
            addJustifiedText(langContent['about-p3']);

            // SERVIÇOS
            addSectionTitle(pdfStrings['services-title'] || 'SERVIÇOS & CONSULTORIA');
            document.querySelectorAll('#servicos .card').forEach(card => {
                const title = card.querySelector('h3').innerText;
                const description = card.querySelector('p').innerText;
                checkPageBreak(50);
                doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(0);
                doc.text(`• ${title}`, margin, y);
                y += 15;
                addJustifiedText(description, { x: margin + 10, width: max_width - 10 });
                y += 8;
            });

            // HABILIDADES
            addSectionTitle(pdfStrings['skills-title'] || 'HABILIDADES TÉCNICAS');
            const skills = Array.from(document.querySelectorAll('.skill-name')).map(s => `• ${s.innerText.trim()}`);
            const midpoint = Math.ceil(skills.length / 2);
            const col1 = skills.slice(0, midpoint);
            const col2 = skills.slice(midpoint);
            const colHeight = Math.max(col1.length, col2.length) * 14;
            checkPageBreak(colHeight);
            doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(80);
            doc.text(col1, margin, y);
            doc.text(col2, page_width / 2, y);
            y += colHeight;

            // ÁREAS DE ATUAÇÃO
            addSectionTitle(pdfStrings['expertise-title'] || 'ÁREAS DE ESPECIALIZAÇÃO');
            document.querySelectorAll('#experiencia .card').forEach(card => {
                 const title = `• ${card.querySelector('h3').innerText}:`;
                 const description = card.querySelector('p').innerText;
                 checkPageBreak(60);
                 const initialY = y;
                 doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(0);
                 const titleLines = doc.splitTextToSize(title, max_width);
                 doc.text(titleLines, margin, y);
                 y += titleLines.length * 12;

                 let textX = margin + 10;
                 let textWidth = max_width - 10;
                 if (titleLines.length === 1) {
                     textX = margin + doc.getTextWidth(title) + 4;
                     textWidth = max_width - (doc.getTextWidth(title) + 4);
                     y = initialY;
                 }
                 addJustifiedText(description, { x: textX, width: textWidth });
                 y += 10;
            });
            
            // FORMAÇÃO
            addSectionTitle(pdfStrings['education-title'] || 'FORMAÇÃO ACADÊMICA');
            document.querySelectorAll('#formacao .timeline-item').forEach(item => {
                checkPageBreak(80);
                const title = item.querySelector('h3').innerText;
                const date = item.querySelector('.timeline-date').innerText;
                const institution = item.querySelector('p:not(.small-muted)').innerText;
                const advisor = item.querySelector('p.small-muted')?.innerHTML || '';
                const details = item.querySelector('.timeline-details').innerText;

                doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(40).text(title, margin, y);
                y += 14;
                doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(100).text(date, margin, y);
                y += 14;
                doc.setFont('helvetica', 'italic').text(institution, margin, y);
                y += 14;
                if(advisor){
                    const advisorLines = doc.splitTextToSize(stripHtml(advisor), max_width);
                    doc.setFont('helvetica', 'normal').text(advisorLines, margin, y);
                    y += advisorLines.length * 14;
                }
                addJustifiedText(details, { fontSize: 9 });
                y += 5;
            });

            // PROJETOS
            addSectionTitle(pdfStrings['projects-title'] || 'PRINCIPAIS PROJETOS');
            (window.githubScript?.allRepos || []).slice(0, 3).forEach(repo => {
                 checkPageBreak(50);
                 doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(0);
                 doc.text(`• ${repo.name}`, margin, y);
                 y += 15;
                 addJustifiedText(repo.description, { x: margin + 10, width: max_width - 10 });
                 y += 8;
            });
            doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(40, 40, 255);
            doc.textWithLink("Para mais projetos, acesse meu perfil no GitHub.", margin, y, { url: 'https://github.com/WevertonGomesCosta' });
            y += 20;
            
            // PUBLICAÇÕES
            addSectionTitle(pdfStrings['publications-title'] || 'PRINCIPAIS PUBLICAÇÕES');
            (window.scholarScript?.allArticles || []).slice(0, 3).forEach(art => {
                const citation = art.cited_by?.value ? `\nCitado ${art.cited_by.value} vezes` : '';
                const fullText = `${art.publication}${citation}`;
                checkPageBreak(60);
                doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(0);
                doc.text(`• ${art.title}`, margin, y);
                y += 15;
                addJustifiedText(fullText, { x: margin + 10, width: max_width - 10 });
                y += 8;
            });
            doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(40, 40, 255);
            doc.textWithLink("Para mais publicações, acesse meu perfil no Google Scholar.", margin, y, { url: 'https://scholar.google.com.br/citations?hl=pt-BR&user=eJNKcHsAAAAJ' });
            y += 20;


            // --- 7. Salvar o PDF ---
            doc.save('CV-Weverton_Gomes_da_Costa.pdf');
            if (toast) {
                toast.textContent = 'Download iniciado!';
                toast.style.backgroundColor = '';
            }

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            if (toast) {
                toast.textContent = 'Ocorreu um erro ao gerar o PDF.';
                toast.style.backgroundColor = '#f44336';
            }
        } finally {
            // --- 8. Restaurar UI ---
            button.innerHTML = originalButtonHTML;
            button.disabled = false;
            setTimeout(() => { if (toast) toast.classList.remove('show'); }, 3000);
        }
    }

    // --- Event Listener ---
    document.addEventListener("DOMContentLoaded", () => {
        const downloadBtn = document.getElementById('download-cv-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                generateCvPdf();
            });
        }
    });

})();

