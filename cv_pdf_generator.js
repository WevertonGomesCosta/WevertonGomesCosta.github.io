
// =================================================================================
// MÓDULO: GERADOR DE CV EM PDF
// =================================================================================
const CvPdfGenerator = {
    init() {
        const downloadBtn = document.getElementById('download-cv-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.generateCvPdf();
            });
        }
    },

    stripHtml(html) {
        if (!html) return "";
        let doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    },

    async generateCvPdf() {
        const button = document.getElementById('download-cv-btn');
        const originalButtonHTML = button.innerHTML;
        const toast = document.getElementById('toast-notification');
        const themeColor = '#10b981';

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

            const doc = new jsPDF('p', 'pt', 'a4');
            const page_width = doc.internal.pageSize.getWidth();
            const margin = 40;
            const max_width = page_width - margin * 2;
            let y = margin;
            const item_gap = 15;

            const checkPageBreak = (neededHeight) => {
                if (y + neededHeight > doc.internal.pageSize.getHeight() - margin) {
                    doc.addPage();
                    y = margin;
                }
            };

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

            if (avatarDataUrl) {
                doc.addImage(avatarDataUrl, 'JPEG', margin, y, 100, 100);
            }
            doc.setFontSize(22).setFont('helvetica', 'bold').setTextColor(0).text(document.getElementById('hero-name').textContent, margin + 115, y + 35);
            doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(100).text("Viçosa - Minas Gerais - Brasil", margin + 115, y + 55);
            doc.setFont('helvetica', 'bold').text("Email:", margin + 115, y + 70);
            doc.setFont('helvetica', 'normal').text("wevertonufv@gmail.com", margin + 155, y + 70);
            doc.setFont('helvetica', 'bold').text("LinkedIn:", margin + 115, y + 85);
            doc.setFont('helvetica', 'normal').setTextColor(40, 40, 255).textWithLink("linkedin.com/in/wevertoncosta", margin + 165, y + 85, { url: 'https://linkedin.com/in/wevertoncosta' });
            y += 120;

            const addSectionTitle = (title) => {
                y += (y > margin + 20) ? 25 : 5;
                checkPageBreak(40);
                doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor('#0f172a');
                doc.text(title.toUpperCase(), margin, y);
                y += 8;
                doc.setLineWidth(1);
                doc.setDrawColor(themeColor);
                doc.line(margin, y, page_width - margin, y);
                y += 20;
            };

            const addJustifiedText = (content, options = {}) => {
                const { fontSize = 10, x = margin, width = max_width, color = 80 } = options;
                if (!content || content.trim() === "") return;
                
                doc.setFontSize(fontSize).setFont('helvetica', 'normal').setTextColor(color);
                const cleanedContent = this.stripHtml(content).replace(/\s+/g, ' ').trim();
                const lines = doc.splitTextToSize(cleanedContent, width);
                const textHeight = lines.length * (fontSize * 1.2);
                checkPageBreak(textHeight);
                doc.text(lines, x, y, { align: 'justify', maxWidth: width });
                y += textHeight + 5;
            };
            
            // --- SECTIONS ---
            addSectionTitle(pdfStrings['about-title'] || 'SOBRE MIM');
            addJustifiedText(langContent['about-p1']);
            addJustifiedText(langContent['about-p2']);
            addJustifiedText(langContent['about-p3']);

            addSectionTitle(pdfStrings['services-title'] || 'SERVIÇOS & CONSULTORIA');
            document.querySelectorAll('#servicos .card').forEach(card => {
                const title = card.querySelector('h3').innerText;
                const description = card.querySelector('p').innerText;
                checkPageBreak(50);
                doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(themeColor);
                doc.text(`• ${title}`, margin, y);
                y += 15;
                addJustifiedText(description, { x: margin + 10, width: max_width - 10 });
                y += item_gap / 2;
            });

            addSectionTitle(pdfStrings['skills-title'] || 'HABILIDADES TÉCNICAS');
            const skillsElements = document.querySelectorAll('#habilidades .skill-name, #skills .skill-name');
            if (skillsElements.length > 0) {
                const skills = Array.from(skillsElements).map(s => `• ${s.innerText.trim()}`);
                const half = Math.ceil(skills.length / 2);
                const column1 = skills.slice(0, half);
                const column2 = skills.slice(half);
                const initialY = y;
                const lineHeight = 14;
                checkPageBreak(column1.length * lineHeight);
                doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(80);
                doc.text(column1, margin, y);
                if (column2.length > 0) {
                    doc.text(column2, margin + (max_width / 2), initialY);
                }
                y += Math.max(column1.length, column2.length) * lineHeight + 10;
            }
            
            addSectionTitle(pdfStrings['expertise-title'] || 'ÁREAS DE ESPECIALIZAÇÃO');
            document.querySelectorAll('#experiencia .card').forEach(card => {
                 const title = `• ${card.querySelector('h3').innerText}:`;
                 const description = card.querySelector('p').innerText;
                 checkPageBreak(60);
                 doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(themeColor);
                 const titleLines = doc.splitTextToSize(title, max_width);
                 const initialY = y;
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
                 y += item_gap;
            });
            
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
                doc.setFontSize(10).setFont('helvetica', 'italic').setTextColor(80).text(institution, margin, y);
                y += 14;
                doc.setFont('helvetica', 'normal').setTextColor(100).text(date, margin, y);
                y += 14;
                if(advisor){
                    const advisorLines = doc.splitTextToSize(this.stripHtml(advisor), max_width);
                    doc.setFont('helvetica', 'normal').text(advisorLines, margin, y);
                    y += advisorLines.length * 14;
                }
                addJustifiedText(details, { fontSize: 9 });
                y += item_gap;
            });

            // MODIFICADO: Seção de Projetos com links
            addSectionTitle(pdfStrings['projects-title'] || 'PRINCIPAIS PROJETOS');
            (GithubReposModule.state.allRepos || []).slice(0, 3).forEach(repo => {
                checkPageBreak(60);
                const repoTitle = `• ${GithubReposModule.titleCase(repo.name)}`;
                const linkUrl = repo.homepage || repo.html_url;
                const linkText = repo.homepage ? '[Ver Site]' : '[Repositório]';

                doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(themeColor);
                doc.text(repoTitle, margin, y);

                if (linkUrl) {
                    const titleWidth = doc.getTextWidth(repoTitle);
                    doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(40, 40, 255);
                    doc.textWithLink(linkText, margin + titleWidth + 5, y, { url: linkUrl });
                }
                y += 15;

                addJustifiedText(repo.description, { x: margin + 10, width: max_width - 10 });
                y += item_gap / 2;
            });
            doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(40, 40, 255);
            const projectsPageUrl = `${window.location.origin}/projetos.html`;
            doc.textWithLink("Para mais projetos, acesse a página de projetos do site.", margin, y, { url: projectsPageUrl });
            y += 20;
            
            // MODIFICADO: Seção de Publicações com links DOI
            addSectionTitle(pdfStrings['publications-title'] || 'PRINCIPAIS PUBLICAÇÕES');
            (scholarScript.allArticles() || []).slice(0, 3).forEach(art => {
                checkPageBreak(80);
            
                doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(themeColor);
                const titleLines = doc.splitTextToSize(`• ${art.title}`, max_width);
                doc.text(titleLines, margin, y);
                y += titleLines.length * 12 + 5;
            
                doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(80);
                const metaText = `Publicado em: ${art.journalTitle || 'N/A'} - ${art.year || 'N/A'}`;
                const metaLines = doc.splitTextToSize(metaText, max_width - 10);
                doc.text(metaLines, margin + 10, y);
                y += metaLines.length * 12 + 5;
            
                if (art.cited_by?.value) {
                    doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(100);
                    const citationText = `Citado ${art.cited_by.value} vezes`;
                    doc.text(citationText, margin + 10, y);
                    y += 12;
                }

                if (art.doi && art.doiLink) {
                    doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(80);
                    const doiLabel = "DOI: ";
                    doc.text(doiLabel, margin + 10, y);
                    const doiLabelWidth = doc.getTextWidth(doiLabel);
                    doc.setTextColor(40, 40, 255);
                    doc.textWithLink(art.doi, margin + 10 + doiLabelWidth, y, { url: art.doiLink });
                    y += 12;
                }
            
                y += item_gap / 2; 
            });
            doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(40, 40, 255);
            const publicationsPageUrl = `${window.location.origin}/publicacoes.html`;
            doc.textWithLink("Para mais publicações, acesse a página de publicações do site.", margin, y, { url: publicationsPageUrl });
            y += 20;

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
            button.innerHTML = originalButtonHTML;
            button.disabled = false;
            setTimeout(() => { if (toast) toast.classList.remove('show'); }, 3000);
        }
    }
};