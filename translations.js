/**
 * @file translations.js
 * @description Gerencia todo o conteúdo de texto e a lógica de inicialização e internacionalização (i18n) do site.
 * @version 3.1.0
 */

const translations = {
    pt: {
        // --- Metadados e Títulos Globais ---
        'page-title': 'Weverton Gomes da Costa | Pesquisador & Data Scientist',
        'projects-page-title': 'Projetos | Weverton Gomes da Costa',
        'publications-page-title': 'Publicações | Weverton Gomes da Costa',
        'privacy-page-title': 'Política de Privacidade | Weverton Gomes da Costa',
        'meta-description': 'Weverton Gomes da Costa - Pesquisador em Genética e Estatística, Cientista de Dados, CEO da Conecta GEM, especialista em Machine Learning e Melhoramento Genético.',
        'projects-meta-description': 'Explore todos os projetos e repositórios de Weverton Gomes da Costa, pesquisador e cientista de dados.',
        'publications-meta-description': 'Explore a lista completa de artigos e publicações científicas de Weverton Gomes da Costa.',
        'privacy-meta-description': 'Política de Privacidade do site de Weverton Gomes da Costa, detalhando a coleta e uso de dados.',
        'meta-keywords': 'genética, biometria, machine learning, agronegócio, UFV, seleção genômica, software GENES, R, Python, melhoramento de plantas',
        'projects-meta-keywords': 'projetos, github, portfólio, R, Python, machine learning, genética',
        'publications-meta-keywords': 'publicações, artigos, pesquisa, genética, biometria, machine learning, UFV',
        'privacy-meta-keywords': 'política de privacidade, dados, segurança, contato, formspree',

        // --- UI Global ---
        'back-to-top-label': 'Voltar ao topo',
        'footer-title': 'Weverton G. Costa',

        // --- Botões e Ações ---
        'change-lang-title': 'Mudar para Inglês',
        'cta-projects': 'Meus Projetos',
        'cta-contact': 'Entre em Contato',
        'clear-search': 'Limpar busca',
        'clear-pub-search': 'Limpar busca de publicações',
        'clear-btn': 'Limpar',
        'show-more': 'Mostrar mais',
        'show-less': 'Mostrar menos',
        'see-all-projects': 'Ver Todos os Projetos',
        'see-all-publications': 'Ver Todas as Publicações',
        'scholar-view-profile': 'Ver Perfil Completo',
        'search-btn': 'Buscar',
        'toggle-details-more': 'Ver mais',
        'toggle-details-less': 'Ver menos',
        'form-submit': 'Enviar Mensagem',
        'download-cv': 'Baixar Currículo (PDF)',
        'contact-email-text': 'Email',
        'back-to-home': '← Voltar para o Início',
        'pub-read': 'Ver publicação →',
        'repo-live-site': 'Ver Site',
        'repo-view-repo': 'Repositório',
        'open_btn': 'Ver no GitHub',
        'copy_btn': 'Copiar Link',
        'copied_btn': 'Copiado!',

        // --- Página Principal (index.html) ---
        'subtitle-1': 'Cientista de Dados | Machine Learning',
        'subtitle-2': 'Pesquisador em Genética & Biometria',
        'subtitle-3': 'Melhoramento de Plantas 4.0',
        'subtitle-4': 'CEO & Cofundador da Conecta GEM',
        'badge-phd': '🎓 Doutorando em Estatística - UFV',
        'badge-ceo': '🚀 CEO & Cofundador - Conecta GEM',
        'badge-postdoc1': '🔬 Pós-Doc FAPEMIG/CNPq',
        'badge-ml': '🤖 Machine Learning Expert',
        'nav-about': 'Sobre',
        'nav-experience': 'Atuação',
        'nav-services': 'Serviços',
        'nav-education': 'Formação',
        'nav-projects': 'Projetos',
        'nav-publications': 'Publicações',
        'nav-skills': 'Habilidades',
        'nav-contact': 'Contato',
        'about-title': 'Sobre Mim',
        'about-p1': `Minha jornada acadêmica, iniciada na Agronomia pela UFV e aprofundada com mestrado e doutorado em Genética e Melhoramento, proporcionou-me uma base sólida para explorar a fronteira do conhecimento. Hoje, como doutorando em Estatística Aplicada e Biometria, busco integrar modelos avançados à pesquisa agronômica. Essa paixão por inovação culminou na cofundação da <strong>Conecta GEM</strong>, onde atuo como <strong>CEO</strong>, liderando a missão de traduzir a ciência de dados em soluções práticas e inteligentes para o agronegócio.`,
        'about-p2': `Minha expertise abrange desde a genética quantitativa e seleção genômica até a aplicação de <strong>machine learning</strong> e <strong>redes neurais</strong> para resolver desafios complexos no melhoramento vegetal. Com domínio de softwares como GENES, R e Python, desenvolvo pipelines de análise que garantem precisão e reprodutibilidade, sempre com o objetivo de gerar impacto real no campo e na academia.`,
        'about-p3': `Atuando no Laboratório de Bioinformática da UFV e como <strong>Coordenador Discente no Laboratório de Inteligência Computacional e Aprendizado Estatístico (LICAE)</strong>, tenho a oportunidade de colaborar em pesquisas de ponta e contribuir para a formação de novos cientistas, unindo esforços para avançar as fronteiras da biometria e da inteligência artificial aplicada à agropecuária.`,
        'services-title': 'Como Posso Ajudar',
        'service-title1': 'Consultoria em Dados e IA',
        'service-desc1': 'Ofereço consultoria especializada para empresas do agronegócio e instituições de pesquisa, transformando dados brutos em insights estratégicos e modelos preditivos acionáveis.',
        'service-title2': 'Colaboração Científica',
        'service-desc2': 'Estou sempre aberto a novas colaborações em projetos de pesquisa que envolvam genética, melhoramento, biometria e a aplicação de inteligência artificial na agricultura.',
        'service-title3': 'Capacitação e Treinamentos',
        'service-desc3': 'Ministro cursos e treinamentos personalizados sobre o uso do software GENES, R, Python, seleção genômica e machine learning para equipes e pesquisadores.',
        'publications-title': 'Publicações e Citações',
        'publications-intro': 'Minha produção científica reflete meu compromisso com a pesquisa de ponta. Abaixo estão algumas das minhas publicações mais relevantes e métricas de citação do Google Scholar.',
        'search-pub-placeholder': 'Buscar por título, periódico...',
        'metric-label-citations': 'Citações',
        'metric-all': 'TODOS',
        'metric-since': 'DESDE 2020',
        'metric-label-h-index': 'Índice h',
        'metric-label-i10-index': 'Índice i10',
        'pub-cited-by': 'Citado',
        'pub-cited-by-times': 'vezes',
        'pub-no-citation': 'Sem dados de citação',
        'pub-published': 'Publicado',
        'pub-in': 'em',
        'pub-doi': 'DOI',
        'education-title': 'Formação Acadêmica',
        'edu-date1': '2023 - Presente',
        'edu-title1': 'Doutorado em Estatística Aplicada e Biometria',
        'edu-desc1': 'Foco em aprimorar conhecimentos em métodos estatísticos avançados e técnicas biométricas.',
        'edu-advisor1': '<strong>Orientador:</strong> Prof. Moyses Nascimento.',
        'edu-date2': '2023 - Presente',
        'edu-title2': 'Pós-Doutorado',
        'edu-desc2': 'Atuação em projetos de pesquisa com foco na aplicação de métodos estatísticos e de inteligência computacional para o melhoramento genético.',
        'edu-advisor2': '<strong>Orientador:</strong> Prof. Moyses Nascimento.',
        'edu-date3': '2022 - 2023',
        'edu-title3': 'Pós-Doutorado',
        'edu-desc3': 'Pesquisa focada em seleção genômica e machine learning, colaborando com diversos projetos de melhoramento genético.',
        'edu-advisor3': '<strong>Orientador:</strong> Prof. Moyses Nascimento.',
        'edu-title4': 'Pós-Doutorado',
        'edu-desc4': 'Análise de dados de GWS e GWAS no projeto de melhoramento genético da mandioca, visando o desenvolvimento de novas cultivares.',
        'edu-advisor4': '<strong>Orientador:</strong> Pesquisador Eder Jorge de Oliveira.',
        'edu-title5': 'Doutorado em Genética e Melhoramento',
        'edu-desc5': 'Tese sobre a eficiência de técnicas de machine learning e redes neurais na predição genômica e identificação de marcadores.',
        'edu-advisor5': '<strong>Orientador:</strong> Prof. Cosme Damião Cruz. <br><strong>Coorientador:</strong> Prof. Moyses Nascimento.',
        'edu-title6': 'Mestrado em Genética e Melhoramento',
        'edu-desc6': 'Dissertação sobre meta-análise de parâmetros genéticos em genótipos de arroz irrigado para otimizar a seleção de cultivares.',
        'edu-advisor6': '<strong>Orientador:</strong> Prof. Aluízio Borém de Oliveira. <br><strong>Coorientador:</strong> Prof. Cosme Damião Cruz.',
        'edu-title7': 'Graduação em Agronomia',
        'edu-desc7': 'Trabalho de conclusão focado no planejamento experimental e análise de dados para o melhoramento genético de arroz irrigado.',
        'edu-advisor7': '<strong>Orientador:</strong> Prof. Plínio César Soares.',
        'expertise-title': 'Áreas de Atuação',
        'exp-title1': 'Genética Quantitativa',
        'exp-desc1': 'Análise e modelagem de características complexas, estimação de parâmetros genéticos e predição de valores genéticos para otimizar programas de melhoramento.',
        'exp-title2': 'Biometria Avançada',
        'exp-desc2': 'Aplicação de modelos mistos, Seleção Genômica Ampla (GWS), e GWAS (Estudo de Associação Genômica Ampla) para identificação de marcadores e estudo de características complexas em genética quantitativa.',
        'exp-title3': 'Machine Learning & IA',
        'exp-desc3': 'Uso de algoritmos, redes neurais e IA para predição genômica, classificação de genótipos e identificação de padrões em dados biológicos.',
        'exp-title4': 'Pipelines Reprodutíveis',
        'exp-desc4': 'Desenvolvimento de pipelines de análise de dados automatizados em R e Python, com versionamento de código e gerenciamento de projetos no GitHub para garantir a reprodutibilidade e a colaboração científica.',
        'exp-title5': 'Melhoramento de Plantas',
        'exp-desc5': 'Planejamento e execução de programas de melhoramento, desde a condução de experimentos até a seleção de genótipos superiores com base em dados fenotípicos e genômicos.',
        'exp-title7': 'Softwares e Ferramentas',
        'exp-desc7': 'Proficiência em softwares estatísticos como GENES, Selegen, R e Python para Análise de dados genéticos e estatísticos com modelos biométricos, cobrindo desde estatística experimental e biometria até análises multivariadas para estimação de parâmetros genéticos.',
        'licae-desc': 'O LICAE é um laboratório multidisciplinar dedicado a propor, avaliar e aplicar técnicas de Inteligência Computacional e Aprendizado Estatístico para solucionar problemas complexos na Agropecuária. Nosso objetivo é aperfeiçoar e complementar as metodologias biométricas tradicionais, desenvolvendo projetos inovadores em áreas como Redes Neurais, Seleção Genômica e Random Forest.',
        'licae-item1': 'Pesquisa em redes neurais e seleção genômica',
        'licae-item2': 'Desenvolvimento de modelos preditivos',
        'licae-item3': 'Colaboração em projetos multidisciplinares',
        'conecta-desc': 'A Conecta GEM nasceu da paixão por compartilhar conhecimento. Somos uma iniciativa que oferece capacitação, consultorias e mentorias de excelência em estatística, genética e melhoramento. Com coordenadores especialistas e uma metodologia focada no aprendizado individual, já qualificamos mais de mil pessoas, conectando a teoria da universidade com a prática do mercado.',
        'conecta-item1': 'Consultoria em biometria e IA',
        'conecta-item2': 'Implementação de pipelines de seleção genômica',
        'conecta-item3': 'Capacitação e treinamentos em R e Python',
        'skills-title': 'Habilidades Técnicas',
        'skills-cat-1': 'Softwares', 'skill-name-r': 'R', 'skill-name-python': 'Python', 'skill-name-genes': 'Software GENES', 'skill-name-selegen': 'Software Selegen',
        'skills-cat-2': 'Análise & Modelagem', 'skill-name-eda': 'Análise Exploratória de Dados (EDA)', 'skill-name-ml': 'Machine Learning', 'skill-name-deep-learning': 'Deep Learning (Keras/TF)',
        'skills-cat-3': 'Biometria', 'skill-name-genomic-sel': 'Seleção Genômica', 'skill-name-mixed-models': 'Modelos Mistos', 'skill-name-quant-gen': 'Genética Quantitativa', 'skill-name-bioinfo': 'Bioinformática',
        'skills-cat-4': 'Desenvolvimento e Plataformas', 'skill-name-dataviz': 'Visualização de Dados', 'skill-name-git': 'Git & GitHub', 'skill-name-shiny': 'Aplicações Interativas (Shiny)', 'skill-name-html': 'HTML & CSS',
        'contact-title': 'Contato',
        'contact-intro': 'Tem alguma pergunta, proposta de colaboração ou projeto em mente? Ficarei feliz em conversar. Utilize o formulário abaixo ou um dos links rápidos.',
        'contact-quick-links': 'Links Rápidos',
        'form-name': 'Nome', 'form-name-ph': 'Seu nome completo', 'form-name-error': 'Por favor, insira seu nome.',
        'form-email': 'Email', 'form-email-ph': 'seu.email@exemplo.com', 'form-email-error': 'Por favor, insira um email válido.',
        'form-subject': 'Assunto', 'form-subject-ph': 'Assunto da sua mensagem', 'form-subject-error': 'Por favor, insira um assunto.',
        'form-message': 'Mensagem', 'form-message-ph': 'Digite sua mensagem aqui...', 'form-message-error': 'Por favor, insira sua mensagem.',
        'formSending': 'Enviando...', 'formSuccess': 'Mensagem enviada com sucesso! Obrigado.', 'formError': 'Ocorreu um erro. Tente novamente.',
        'chart-title': 'Citações e Publicações por Ano', 'chart-title-mobile': 'Citações/Pubs por Ano', 'chart-xaxis-title': 'Ano', 'chart-yaxis-title': 'Número de Citações', 'chart-colorbar-title': 'Nº de Publicações',
        'projects-title': 'Projetos & Repositórios',
        'projects-intro': 'Abaixo estão alguns dos meus repositórios públicos no GitHub. Eles refletem meu trabalho em desenvolvimento de software, pipelines de análise e estudos em machine learning aplicado, sempre com foco em criar ferramentas reprodutíveis e de impacto para a comunidade científica e o mercado.',
        'search-placeholder': 'Buscar repositório...',
        'no_repos_found': 'Nenhum repositório encontrado com este filtro.', 'no_description': 'Sem descrição fornecida.',
        // CORREÇÃO: Nova chave de tradução adicionada
        'repo-last-update': 'Última atualização:',
        'all-projects-title': 'Todos os Projetos & Repositórios',
        'all-projects-intro': 'Explore a lista completa de todos os meus projetos e repositórios públicos. Use a busca abaixo para filtrar por nome, descrição, linguagem ou tópico.',
        'all-publications-title': 'Todas as Publicações',
        'all-publications-intro': 'Explore a lista completa de minhas publicações científicas. Use a busca abaixo para filtrar por título, periódico ou palavra-chave.',
        'showing_repos': (shown, total) => `Exibindo ${shown} de ${total} repositórios.`,
        'showing_pubs': (shown, total) => `Exibindo ${shown} de ${total} publicações.`,
        'no_pubs_found': 'Nenhuma publicação encontrada com os filtros aplicados.',
        'footer-bio': 'Cientista de dados apaixonado por aplicar estatística e IA para impulsionar a inovação no melhoramento genético e agronegócio.',
        'footer-sitemap': 'Mapa do Site', 'footer-academic-profiles': 'Perfis Acadêmicos', 'footer-professional-profiles': 'Redes e Perfis',
        'footer-license-text-short': 'Licença CC BY-SA 4.0', 'privacy-policy': 'Política de Privacidade', 
        'footer-update-text': 'Última atualização',
        'footer-location': 'Viçosa - MG, Brasil',
        'privacy-title': "Política de Privacidade", 
        'privacy-last-updated': 'Última atualização',
        'privacy-intro-title': "1. Introdução", 'privacy-intro-p': "Esta Política de Privacidade descreve como as informações pessoais são coletadas, usadas e compartilhadas quando você visita este site e utiliza o formulário de contato.",
        'privacy-collection-title': "2. Coleta de Dados", 'privacy-collection-p1': "As únicas informações pessoais que coletamos são aquelas que você voluntariamente nos fornece através do formulário de contato. Isso inclui:", 'privacy-collection-li1': "Nome", 'privacy-collection-li2': "Endereço de email", 'privacy-collection-li3': "Assunto da mensagem", 'privacy-collection-li4': "Conteúdo da mensagem", 'privacy-collection-p2': "Não utilizamos cookies para rastreamento ou coleta de dados de navegação.",
        'privacy-usage-title': "3. Uso de Dados", 'privacy-usage-p': "As informações fornecidas no formulário de contato são utilizadas exclusivamente para a finalidade de responder à sua solicitação ou mensagem. Seus dados não serão armazenados neste site, nem utilizados para fins de marketing ou compartilhados com terceiros, exceto o serviço de processamento de formulários.",
        'privacy-services-title': "4. Serviços de Terceiros", 'privacy-services-p': "Este site utiliza os seguintes serviços de terceiros:", 'privacy-services-li1': "Para processar e encaminhar as mensagens enviadas através do formulário de contato para o meu email. A Formspree possui sua própria política de privacidade, que você pode consultar no site deles.", 'privacy-services-li2': "Para a hospedagem deste site.", 'privacy-services-li3': "Para otimização de desempenho e segurança.",
        'privacy-security-title': "5. Segurança", 'privacy-security-p': "Embora nenhum método de transmissão pela Internet ou armazenamento eletrônico seja 100% seguro, tomamos precauções razoáveis para proteger suas informações. O tráfego deste site é protegido por HTTPS.",
        'privacy-rights-title': "6. Seus Direitos", 'privacy-rights-p': "Você tem o direito de solicitar informações sobre os dados que forneceu e de pedir sua exclusão a qualquer momento, entrando em contato diretamente pelo email <a href='mailto:wevertonufv@gmail.com'>wevertonufv@gmail.com</a>.",
        'privacy-changes-title': "7. Alterações na Política", 'privacy-changes-p': "Esta Política de Privacidade pode ser atualizada periodicamente. Recomendamos que você revise esta página ocasionalmente para estar ciente de quaisquer alterações.",
        'privacy-contact-title': "8. Contato", 'privacy-contact-p': "Se você tiver alguma dúvida sobre esta Política de Privacidade, entre em contato pelo email <a href='mailto:wevertonufv@gmail.com'>wevertonufv@gmail.com</a>.",
        'privacy-back-link': "← Voltar ao site principal",
        'pdf': { 'about-title': 'SOBRE MIM', 'services-title': 'COMO POSSO AJUDAR', 'skills-title': 'HABILIDADES TÉCNICAS', 'expertise-title': 'ÁREAS DE ATUAÇÃO', 'education-title': 'FORMAÇÃO ACADÊMICA', 'projects-title': 'PRINCIPAIS PROJETOS', 'publications-title': 'PRINCIPAIS PUBLICAÇÕES' }
    },
    en: {
        // --- Global Meta & Titles ---
        'page-title': 'Weverton Gomes da Costa | Researcher & Data Scientist',
        'projects-page-title': 'Projects | Weverton Gomes da Costa',
        'publications-page-title': 'Publications | Weverton Gomes da Costa',
        'privacy-page-title': 'Privacy Policy | Weverton Gomes da Costa',
        'meta-description': 'Weverton Gomes da Costa - Researcher in Genetics and Statistics, Data Scientist, CEO of Conecta GEM, specialist in Machine Learning and Plant Breeding.',
        'projects-meta-description': 'Explore all projects and repositories by Weverton Gomes da Costa, researcher and data scientist.',
        'publications-meta-description': 'Explore the complete list of scientific articles and publications by Weverton Gomes da Costa.',
        'privacy-meta-description': 'Privacy Policy for the website of Weverton Gomes da Costa, detailing data collection and usage.',
        'meta-keywords': 'genetics, biometrics, machine learning, agribusiness, UFV, genomic selection, GENES software, R, Python, plant breeding',
        'projects-meta-keywords': 'projects, github, portfolio, R, Python, machine learning, genetics',
        'publications-meta-keywords': 'publications, articles, research, genetics, biometrics, machine learning, UFV',
        'privacy-meta-keywords': 'privacy policy, data, security, contact, formspree',

        // --- Global UI ---
        'back-to-top-label': 'Back to top',
        'footer-title': 'Weverton G. Costa',

        // --- Buttons & Actions ---
        'change-lang-title': 'Switch to Portuguese',
        'cta-projects': 'My Projects',
        'cta-contact': 'Get in Touch',
        'clear-search': 'Clear search',
        'clear-pub-search': 'Clear publication search',
        'clear-btn': 'Clear',
        'show-more': 'Show more',
        'show-less': 'Show less',
        'see-all-projects': 'See All Projects',
        'see-all-publications': 'See All Publications',
        'scholar-view-profile': 'View Full Profile',
        'search-btn': 'Search',
        'toggle-details-more': 'Show more',
        'toggle-details-less': 'Show less',
        'form-submit': 'Send Message',
        'download-cv': 'Download CV (PDF)',
        'contact-email-text': 'Email',
        'back-to-home': '← Back to Home',
        'pub-read': 'Read publication →',
        'repo-live-site': 'View Site',
        'repo-view-repo': 'Repository',
        'open_btn': 'View on GitHub',
        'copy_btn': 'Copy Link',
        'copied_btn': 'Copied!',

        // --- Main Page (index.html) ---
        'subtitle-1': 'Data Scientist | Machine Learning',
        'subtitle-2': 'Researcher in Genetics & Biometrics',
        'subtitle-3': 'Plant Breeding 4.0',
        'subtitle-4': 'CEO & Co-founder of Conecta GEM',
        'badge-phd': '🎓 PhD Candidate in Statistics - UFV',
        'badge-ceo': '🚀 CEO & Co-founder - Conecta GEM',
        'badge-postdoc1': '🔬 Post-Doc FAPEMIG/CNPq',
        'badge-ml': '🤖 Machine Learning Expert',
        'nav-about': 'About', 'nav-experience': 'Practice', 'nav-services': 'Services', 'nav-education': 'Education', 'nav-projects': 'Projects', 'nav-publications': 'Publications', 'nav-skills': 'Skills', 'nav-contact': 'Contact',
        'about-title': 'About Me',
        'about-p1': `My academic journey, which began in Agronomy at UFV and deepened with a Master's and PhD in Genetics and Plant Breeding, provided me with a solid foundation to explore the frontier of knowledge. Today, as a PhD candidate in Applied Statistics and Biometrics, I seek to integrate advanced models into agricultural research. This passion for innovation culminated in the co-founding of <strong>Conecta GEM</strong>, where I serve as <strong>CEO</strong>, leading our mission to translate data science into practical and intelligent solutions for agribusiness.`,
        'about-p2': `My expertise ranges from quantitative genetics and genomic selection to the application of <strong>machine learning</strong> and <strong>neural networks</strong> to solve complex challenges in plant breeding. With proficiency in software like GENES, R, and Python, I develop analysis pipelines that ensure precision and reproducibility, always aiming to generate real impact in the field and in academia.`,
        'about-p3': `Working at the UFV Bioinformatics Laboratory and as <strong>Student Coordinator at the Laboratory of Computational Intelligence and Statistical Learning (LICAE)</strong>, I have the opportunity to collaborate on cutting-edge research and contribute to the training of new scientists, joining efforts to advance the frontiers of biometrics and artificial intelligence applied to agriculture.`,
        'services-title': 'How I Can Help',
        'service-title1': 'Data & AI Consulting', 'service-desc1': 'I offer specialized consulting for agribusiness companies and research institutions, turning raw data into strategic insights and actionable predictive models.',
        'service-title2': 'Scientific Collaboration', 'service-desc2': 'I am always open to new collaborations on research projects involving genetics, breeding, biometrics, and the application of artificial intelligence in agriculture.',
        'service-title3': 'Training and Workshops', 'service-desc3': 'I conduct customized courses and training on the use of GENES software, R, Python, genomic selection, and machine learning for teams and researchers.',
        'publications-title': 'Publications and Citations',
        'publications-intro': 'My scientific output reflects my commitment to cutting-edge research. Below are some of my most relevant publications, citation metrics from Google Scholar, and their respective DOIs obtained via ORCID.',
        'search-pub-placeholder': 'Search by title, journal...',
        'metric-label-citations': 'Citations', 'metric-all': 'ALL', 'metric-since': 'SINCE 2020', 'metric-label-h-index': 'h-index', 'metric-label-i10-index': 'i10-index',
        'pub-cited-by': 'Cited by', 'pub-cited-by-times': 'times', 'pub-no-citation': 'No citation data', 'pub-published': 'Published', 'pub-in': 'in', 'pub-doi': 'DOI',
        'education-title': 'Academic Background',
        'edu-date1': '2023 - Present', 'edu-title1': 'PhD in Applied Statistics and Biometrics', 'edu-desc1': 'Focus on enhancing knowledge in advanced statistical methods and biometric techniques.', 'edu-advisor1': '<strong>Advisor:</strong> Prof. Moyses Nascimento.',
        'edu-date2': '2023 - Present', 'edu-title2': 'Postdoctoral Fellowship', 'edu-desc2': 'Engaged in research projects focused on applying statistical and computational intelligence methods to genetic improvement.', 'edu-advisor2': '<strong>Advisor:</strong> Prof. Moyses Nascimento.',
        'edu-date3': '2022 - 2023', 'edu-title3': 'Postdoctoral Fellowship', 'edu-desc3': 'Research focused on genomic selection and machine learning, collaborating on various genetic improvement projects.', 'edu-advisor3': '<strong>Advisor:</strong> Prof. Moyses Nascimento.',
        'edu-title4': 'Postdoctoral Fellowship', 'edu-desc4': 'Data analysis of GWS and GWAS in the cassava genetic improvement project, aiming to develop new cultivars.', 'edu-advisor4': '<strong>Advisor:</strong> Researcher Eder Jorge de Oliveira.',
        'edu-title5': 'PhD in Genetics and Plant Breeding', 'edu-desc5': 'Thesis focused on the efficiency of machine learning and neural network techniques in genomic prediction and marker identification.', 'edu-advisor5': '<strong>Advisor:</strong> Prof. Cosme Damião Cruz. <br><strong>Co-advisor:</strong> Prof. Moyses Nascimento.',
        'edu-title6': 'MSc in Genetics and Plant Breeding', 'edu-desc6': 'Dissertation on meta-analysis of genetic parameters in irrigated rice genotypes to optimize cultivar selection.', 'edu-advisor6': '<strong>Advisor:</strong> Prof. Aluízio Borém de Oliveira. <br><strong>Co-advisor:</strong> Prof. Cosme Damião Cruz.',
        'edu-title7': 'BSc in Agronomy', 'edu-desc7': 'Final paper focused on experimental design and data analysis for the genetic improvement of irrigated rice.', 'edu-advisor7': '<strong>Advisor:</strong> Prof. Plínio César Soares.',
        'expertise-title': 'Areas of Practice',
        'exp-title1': 'Quantitative Genetics', 'exp-desc1': 'Analysis and modeling of complex traits, estimation of genetic parameters, and prediction of genetic values to optimize breeding programs.',
        'exp-title2': 'Advanced Biometrics', 'exp-desc2': 'Application of mixed models, Genome-Wide Selection (GWS), and GWAS (Genome-Wide Association Study) for marker identification and the study of complex traits in quantitative genetics.',
        'exp-title3': 'Machine Learning & AI', 'exp-desc3': 'Use of algorithms, neural networks, and AI for genomic prediction, genotype classification, and pattern recognition in biological data.',
        'exp-title4': 'Reproducible Pipelines', 'exp-desc4': 'Development of automated data analysis pipelines in R and Python, using Git and GitHub for code versioning and project management to ensure reproducibility and scientific collaboration.',
        'exp-title5': 'Plant Breeding', 'exp-desc5': 'Planning and execution of breeding programs, from conducting field experiments to selecting superior genotypes based on phenotypic and genomic data.',
        'exp-title7': 'Software & Tools', 'exp-desc7': 'Proficiency in statistical software like GENES, Selegen, R, and Python for automation, analysis, and visualization of complex data.',
        'licae-desc': 'LICAE is a multidisciplinary laboratory dedicated to proposing, evaluating, and applying Computational Intelligence and Statistical Learning techniques to solve complex problems in Agriculture. Our goal is to enhance and complement traditional biometric methodologies by developing innovative projects in areas such as Neural Networks, Genomic Selection, and Random Forest.',
        'licae-item1': 'Research on neural networks and genomic selection', 'licae-item2': 'Development of predictive models', 'licae-item3': 'Collaboration in multidisciplinary projects',
        'conecta-desc': 'Conecta GEM was born from a passion for sharing knowledge. We are an initiative that offers high-quality training, consulting, and mentoring in statistics, genetics, and breeding. With expert coordinators and a methodology focused on individual learning, we have already qualified over a thousand people, connecting university theory with market practice.',
        'conecta-item1': 'Custom data solutions', 'conecta-item2': 'Integrated analysis platform', 'conecta-item3': 'Training and technical support',
        'skills-title': 'Technical Skills',
        'skills-cat-1': 'Software', 'skill-name-r': 'R', 'skill-name-python': 'Python', 'skill-name-genes': 'GENES Software', 'skill-name-selegen': 'Selegen Software',
        'skills-cat-2': 'Analysis & Modeling', 'skill-name-eda': 'Exploratory Data Analysis (EDA)', 'skill-name-ml': 'Machine Learning', 'skill-name-deep-learning': 'Deep Learning (Keras/TF)',
        'skills-cat-3': 'Biometrics', 'skill-name-genomic-sel': 'Genomic Selection', 'skill-name-mixed-models': 'Mixed Models', 'skill-name-quant-gen': 'Quantitative Genetics', 'skill-name-bioinfo': 'Bioinformatics',
        'skills-cat-4': 'Development & Platforms', 'skill-name-dataviz': 'Data Visualization', 'skill-name-git': 'Git & GitHub', 'skill-name-shiny': 'Interactive Apps (Shiny)', 'skill-name-html': 'HTML & CSS',
        'contact-title': 'Contact',
        'contact-intro': 'Have a question, a proposal for collaboration, or a project in mind? I\'d be happy to chat. Please use the form below or one of the quick links.',
        'contact-quick-links': 'Quick Links',
        'form-name': 'Name', 'form-name-ph': 'Your full name', 'form-name-error': 'Please enter your name.',
        'form-email': 'Email', 'form-email-ph': 'your.email@example.com', 'form-email-error': 'Please enter a valid email.',
        'form-subject': 'Subject', 'form-subject-ph': 'Subject of your message', 'form-subject-error': 'Please enter a subject.',
        'form-message': 'Message', 'form-message-ph': 'Type your message here...', 'form-message-error': 'Please enter your message.',
        'formSending': 'Sending...', 'formSuccess': 'Message sent successfully! Thank you.', 'formError': 'An error occurred. Please try again.',
        'chart-title': 'Citations and Publications per Year', 'chart-title-mobile': 'Citations/Pubs per Year', 'chart-xaxis-title': 'Year', 'chart-yaxis-title': 'Number of Citations', 'chart-colorbar-title': 'Nº of Publications',
        'projects-title': 'Projects & Repositories',
        'projects-intro': 'Here are some of my public projects on GitHub, including analysis codes, tutorials, and developed tools. Feel free to explore, use, and contribute.',
        'search-placeholder': 'Search repository...',
        'no_repos_found': 'No repositories found with this filter.', 'no_description': 'No description provided.',
        // CORREÇÃO: Nova chave de tradução adicionada
        'repo-last-update': 'Last updated:',
        'all-projects-title': 'All Projects & Repositories',
        'all-projects-intro': 'Explore the complete list of all my public projects and repositories. Use the search below to filter by name, description, language, or topic.',
        'all-publications-title': 'All Publications',
        'all-publications-intro': 'Explore the complete list of my scientific publications. Use the search below to filter by title, journal, or keyword.',
        'showing_repos': (shown, total) => `Showing ${shown} of ${total} repositories.`,
        'showing_pubs': (shown, total) => `Showing ${shown} of ${total} publications.`,
        'no_pubs_found': 'No publications found with the applied filters.',
        'footer-bio': 'A data scientist passionate about applying statistics and AI to drive innovation in genetic improvement and agribusiness.',
        'footer-sitemap': 'Sitemap', 'footer-academic-profiles': 'Academic Profiles', 'footer-professional-profiles': 'Networks & Profiles',
        'footer-license-text-short': 'License CC BY-SA 4.0', 'privacy-policy': 'Privacy Policy', 
        'footer-update-text': 'Last updated',
        'footer-location': 'Viçosa - MG, Brazil',
        "privacy-title": "Privacy Policy", 
        'privacy-last-updated': 'Last updated',
        "privacy-intro-title": "1. Introduction", "privacy-intro-p": "This Privacy Policy describes how personal information is collected, used, and shared when you visit this website and use the contact form.",
        "privacy-collection-title": "2. Data Collection", "privacy-collection-p1": "The only personal information we collect is what you voluntarily provide through the contact form. This includes:", "privacy-collection-li1": "Name", "privacy-collection-li2": "Email address", "privacy-collection-li3": "Message subject", "privacy-collection-li4": "Message content", "privacy-collection-p2": "We do not use cookies for tracking or collecting navigation data.",
        "privacy-usage-title": "3. Use of Data", "privacy-usage-p": "The information provided in the contact form is used exclusively for the purpose of responding to your request or message. Your data will not be stored on this site, used for marketing purposes, or shared with third parties, except for the form processing service.",
        "privacy-services-title": "4. Third-Party Services", "privacy-services-p": "This site uses the following third-party services:", "privacy-services-li1": "To process and forward messages sent through the contact form to my email. Formspree has its own privacy policy, which you can consult on their website.", "privacy-services-li2": "For hosting this site.", "privacy-services-li3": "For performance and security optimization.",
        "privacy-security-title": "5. Security", "privacy-security-p": "Although no method of transmission over the Internet or electronic storage is 100% secure, we take reasonable precautions to protect your information. This site's traffic is protected by HTTPS.",
        "privacy-rights-title": "6. Your Rights", "privacy-rights-p": "You have the right to request information about the data you have provided and to ask for its deletion at any time by contacting us directly via email at <a href='mailto:wevertonufv@gmail.com'>wevertonufv@gmail.com</a>.",
        "privacy-changes-title": "7. Changes to the Policy", "privacy-changes-p": "This Privacy Policy may be updated periodically. We recommend that you review this page occasionally to be aware of any changes.",
        "privacy-contact-title": "8. Contact", "privacy-contact-p": "If you have any questions about this Privacy Policy, please contact us via email at <a href='mailto:wevertonufv@gmail.com'>wevertonufv@gmail.com</a>.",
        "privacy-back-link": "← Back to main site",
        'pdf': { 'about-title': 'ABOUT ME', 'services-title': 'HOW I CAN HELP', 'skills-title': 'TECHNICAL SKILLS', 'expertise-title': 'AREAS OF PRACTICE', 'education-title': 'ACADEMIC BACKGROUND', 'projects-title': 'MAIN PROJECTS', 'publications-title': 'MAIN PUBLICATIONS' }
    }
};

let currentLang = 'pt';
let subtitleTimeout;
let subtitleIndex = 0;
let charIndex = 0;
let isDeleting = false;

// --- Main Application Logic ---
const App = {
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.updateFooterInfo();
            this.initScrollAnimations();
            this.initEventListeners();
            setLanguage('pt');
        });
    },

    updateFooterInfo() {
        const copyrightYearEl = document.getElementById('copyright-year');
        if (copyrightYearEl) {
            copyrightYearEl.textContent = new Date().getFullYear();
        }

        const setDate = (elementId) => {
            const el = document.getElementById(elementId);
            if (el) {
                const lastModifiedDate = document.lastModified ? new Date(document.lastModified) : new Date();
                const locale = currentLang === 'pt' ? 'pt-BR' : 'en-US';
                el.textContent = lastModifiedDate.toLocaleDateString(locale, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
            }
        };

        setDate('last-updated-date');
        setDate('update-date');
    },


    initScrollAnimations() {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

        const skillObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    const level = entry.target.dataset.level;
                    const bar = entry.target.querySelector('.skill-bar');
                    if (bar && level) {
                        bar.style.setProperty('--proficiency-level', level);
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        document.querySelectorAll('.skill-item').forEach(el => skillObserver.observe(el));

        document.querySelectorAll('.stagger-children').forEach(container => {
            container.querySelectorAll('.reveal, .skill-item').forEach((child, index) => {
                child.style.setProperty('--stagger-index', index);
            });
        });

        const sections = document.querySelectorAll('main > section[id]');
        const navLinks = document.querySelectorAll('nav .nav-link');
        const navObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, { rootMargin: '-40% 0px -60% 0px' });

        sections.forEach(section => navObserver.observe(section));
    },
    
    initEventListeners() {
        const nav = document.querySelector('nav');
        const header = document.querySelector('header');
        const body = document.body;
        const backToTopButton = document.querySelector('.back-to-top');
        
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            
            if (nav) {
                if (header) { 
                    const isHeaderScrolled = scrollY > header.offsetHeight - 100;
                    nav.classList.toggle('scrolled', isHeaderScrolled);
                    body.classList.toggle('scrolled', isHeaderScrolled);
                } else { 
                    nav.classList.toggle('scrolled', scrollY > 50);
                }
            }
            if (backToTopButton) {
                backToTopButton.classList.toggle('visible', scrollY > 300);
            }
        }, { passive: true });

        document.body.addEventListener('mousemove', e => {
            const card = e.target.closest('.card');
            if (card) {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            }
        });

        const timeline = document.querySelector('.timeline');
        if (timeline) {
            timeline.addEventListener('click', this.handleTimelineToggle.bind(this));
        }
        
        const copyEmailLink = document.getElementById('copy-email-link');
        if (copyEmailLink) {
            copyEmailLink.addEventListener('click', this.handleEmailCopy.bind(this));
        }
    },

    handleTimelineToggle(event) {
        const button = event.target.closest('.toggle-details-btn');
        if (!button) return;

        const item = button.closest('.timeline-item');
        item.classList.toggle('expanded');
        
        const moreText = translations[currentLang]['toggle-details-more'] || 'Ver mais';
        const lessText = translations[currentLang]['toggle-details-less'] || 'Ver menos';
        
        button.textContent = item.classList.contains('expanded') ? lessText : moreText;
        
        const details = item.querySelector('.timeline-details');
        if (item.classList.contains('expanded') && details.dataset.key) {
            details.innerHTML = translations[currentLang][details.dataset.key] || '';
        }
    },

    handleEmailCopy(event) {
        event.preventDefault();
        const emailToCopy = 'wevertonufv@gmail.com';
        navigator.clipboard.writeText(emailToCopy).then(() => {
            this.showToast(`Email: ${emailToCopy} copiado!`);
        }).catch(err => {
            console.error('Failed to copy email: ', err);
            this.showToast('Falha ao copiar o email.');
        });
    },

    showToast(message) {
        const toast = document.getElementById('toast-notification');
        if (toast) {
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    },
};

// --- Funções de Tradução e Conteúdo Dinâmico ---
function typeAndEraseSubtitle() {
      const subtitleEl = document.getElementById('subtitle');
      if (!subtitleEl) return;
      clearTimeout(subtitleTimeout);
      const phrases = [
            translations[currentLang]['subtitle-1'],
            translations[currentLang]['subtitle-2'],
            translations[currentLang]['subtitle-3'],
            translations[currentLang]['subtitle-4']
      ].filter(Boolean);
      if (phrases.length === 0) return;
      const currentPhrase = phrases[subtitleIndex];
      let typeSpeed = 100;

      if (isDeleting) {
            charIndex--;
      } else {
            charIndex++;
      }
      subtitleEl.innerHTML = currentPhrase.substring(0, charIndex);

      if (!isDeleting && charIndex === currentPhrase.length) {
            isDeleting = true;
            typeSpeed = 2000;
      } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            subtitleIndex = (subtitleIndex + 1) % phrases.length;
            typeSpeed = 500;
      }
      subtitleTimeout = setTimeout(typeAndEraseSubtitle, typeSpeed);
}

function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';

    const bodyId = document.body.id || 'page-home';
    let pageTitleKey = 'page-title', metaDescKey = 'meta-description', metaKeywordsKey = 'meta-keywords';

    if (bodyId.includes('projects')) {
        pageTitleKey = 'projects-page-title';
        metaDescKey = 'projects-meta-description';
        metaKeywordsKey = 'projects-meta-keywords';
    } else if (bodyId.includes('publications')) {
        pageTitleKey = 'publications-page-title';
        metaDescKey = 'publications-meta-description';
        metaKeywordsKey = 'publications-meta-keywords';
    } else if (bodyId.includes('privacy')) {
        pageTitleKey = 'privacy-page-title';
        metaDescKey = 'privacy-meta-description';
        metaKeywordsKey = 'privacy-meta-keywords';
    }

    document.title = translations[lang][pageTitleKey];
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute('content', translations[lang][metaDescKey]);
    const keywordsEl = document.querySelector('meta[name="keywords"]');
    if (keywordsEl) keywordsEl.setAttribute('content', translations[lang][metaKeywordsKey]);

    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.dataset.key;
        const translation = translations[lang][key];
        if (translation && typeof translation !== 'function') {
             el.innerHTML = translation;
        }
    });

    document.querySelectorAll('[data-key-placeholder]').forEach(el => {
        el.placeholder = translations[lang][el.dataset.keyPlaceholder] || '';
    });
    document.querySelectorAll('[data-key-title]').forEach(el => {
        el.title = translations[lang][el.dataset.keyTitle] || '';
    });
    document.querySelectorAll('[data-key-aria-label]').forEach(el => {
        el.setAttribute('aria-label', translations[lang][el.dataset.keyAriaLabel] || '');
    });

    const isPt = lang === 'pt';
    document.querySelectorAll('.lang-switcher, .lang-switch-fixed, .lang-switch').forEach(button => {
        button.querySelector('.lang-pt')?.classList.toggle('active', isPt);
        button.querySelector('.lang-en')?.classList.toggle('active', !isPt);
    });

    if (document.getElementById('subtitle')) {
        clearTimeout(subtitleTimeout);
        subtitleIndex = 0; charIndex = 0; isDeleting = false;
        typeAndEraseSubtitle();
    }
    
    // Chama a atualização da data e outros scripts
    App.updateFooterInfo();
    if (window.githubScript?.renderAll) window.githubScript.renderAll();
    if (window.scholarScript?.renderAll) window.scholarScript.renderAll();
}

window.toggleLanguage = () => setLanguage(currentLang === 'pt' ? 'en' : 'pt');

App.init();