/**
 * @file cv_pdf_generator.js
 * @description Este módulo é responsável por gerar o currículo em PDF. Ele expõe uma única função, `generateCvPdf`, que pode ser chamada por outros scripts para iniciar o processo.
 * @author Weverton C.
 * @version 2.2.0
 *
 * Dependências:
 * - `window.jspdf`: A biblioteca jsPDF deve ser carregada globalmente.
 * - `window.translations`, `window.currentLang`: Variáveis globais para textos.
 */
const PdfGenerator = (function() {

    /**
     * Gera e inicia o download de um currículo em formato PDF.
     * Extrai informações diretamente do DOM e as formata em um documento A4.
     */
    async function generateCvPdf() {
        const button = document.getElementById('download-cv-btn');
        if (!button) {
            console.error("Botão de download do CV não encontrado.");
            return;
        }
        const originalButtonHTML = button.innerHTML;
        const toast = document.getElementById('toast-notification');
        const {
            jsPDF
        } = window.jspdf;
        const pdfTranslations = translations.pdf[currentLang];

        // Atualiza a UI para indicar que o PDF está sendo gerado
        button.innerHTML = `<svg class="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem; margin-right: 0.75rem;"><path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg> Gerando...`;
        button.style.pointerEvents = 'none';
        if (toast) {
            toast.textContent = 'Preparando seu currículo...';
            toast.classList.add('show');
        }

        try {
            const doc = new jsPDF('p', 'pt', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 40;
            let y = margin;

            // Funções auxiliares para construir o PDF
            const addSectionTitle = (title) => {
                y += (y > margin ? 20 : 0);
                doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(0).text(title.toUpperCase(), margin, y);
                y += 10;
                doc.setLineWidth(1).line(margin, y - 5, pageWidth - margin, y - 5);
            };

            const addJustifiedText = (content) => {
                const lines = doc.splitTextToSize(content.replace(/<[^>]+>/g, ' ').trim(), pageWidth - margin * 2);
                doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(80).text(lines, margin, y, {
                    align: 'justify'
                });
                y += lines.length * 12 + 5;
            };

            // Carrega a imagem do avatar
            const avatarImg = document.querySelector('.avatar');
            let avatarDataUrl = null;
            if (avatarImg) {
                try {
                    // Usando um proxy CORS para evitar problemas de bloqueio de origem
                    const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(avatarImg.src)}`);
                    const blob = await response.blob();
                    avatarDataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.error("Falha ao carregar imagem do avatar:", e);
                }
            }

            // Seção de Cabeçalho
            if (avatarDataUrl) doc.addImage(avatarDataUrl, 'JPEG', margin, y, 80, 80);
            const heroName = document.getElementById('hero-name')?.textContent || 'Nome não encontrado';
            doc.setFontSize(22).setFont('helvetica', 'bold').text(heroName, margin + 95, y + 25);
            doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(100).text("Viçosa, MG, Brasil | wevertonufv@gmail.com | linkedin.com/in/wevertoncosta", margin + 95, y + 40);
            y += 100;

            // Seção "Sobre"
            addSectionTitle(pdfTranslations['about-title']);
            const aboutText = Array.from(document.querySelectorAll('#sobre p')).map(p => p.innerText).join('\n\n');
            addJustifiedText(aboutText);

            // Adicione mais seções aqui (Formação, Habilidades, etc.) seguindo o mesmo padrão:
            // addSectionTitle(pdfTranslations['education-title']);
            // const educationText = ...
            // addJustifiedText(educationText);

            // Salva o PDF
            doc.save('CV-Weverton_Gomes_da_Costa.pdf');
            if (toast) toast.textContent = 'Download iniciado!';

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            if (toast) toast.textContent = 'Erro ao gerar o PDF.';
        } finally {
            // Restaura o botão ao seu estado original
            button.innerHTML = originalButtonHTML;
            button.style.pointerEvents = 'auto';
            if (toast) {
                setTimeout(() => toast.classList.remove('show'), 4000);
            }
        }
    }

    // Expõe a função para ser acessível globalmente
    return {
        generateCvPdf
    };
})();
