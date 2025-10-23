/**
 * @file translations.js
 * @description Gerencia todo o conteúdo de texto e a lógica de inicialização e internacionalização (i18n) do site.
 * @version 3.2.0 (Padronizado com chaves de data)
 */

const translations = {
    pt: {
        // --------------------------------------------------------------------
        // 1. METADADOS GLOBAIS (PARA SEO E TÍTULOS DE PÁGINA)
        // --------------------------------------------------------------------
        
        // ALTERADO: Alinhado com o novo Título do LinkedIn.
        'page-title': 'Weverton Gomes da Costa | PhD | CEO | Data Science & IA',
        
        'projects-page-title': 'Projetos | Weverton Gomes da Costa', // (Mantido)
        'publications-page-title': 'Publicações | Weverton Gomes da Costa', // (Mantido)
        'privacy-page-title': 'Política de Privacidade | Weverton Gomes da Costa', // (Mantido)

        // ALTERADO: Substituída a lista de cargos pela nova proposta de valor.
        'meta-description': 'PhD, CEO da Conecta GEM e Cientista de Dados. Especialista em traduzir desafios de genética e melhoramento em soluções práticas usando IA e Machine Learning.',
        
        // ALTERADO: Adicionado foco em IA e Genética Quantitativa.
        'projects-meta-description': 'Explore os projetos de Data Science, IA e Genética de Weverton Gomes da Costa, focados em Machine Learning e Genética Quantitativa.',
        
        // ALTERADO: Adicionado foco em Deep Learning.
        'publications-meta-description': 'Explore as publicações científicas de Weverton Gomes da Costa, com foco em Deep Learning, Genética e Análise Estatística.',
        
        'privacy-meta-description': 'Política de Privacidade do site de Weverton Gomes da Costa, detalhando a coleta e uso de dados.', // (Mantido)

        // ALTERADO: Removido "agronegócio". Adicionadas "IA", "CEO", "Conecta GEM".
        'meta-keywords': 'CEO, Data Science, IA, Inteligência Artificial, Machine Learning, Genética Quantitativa, Seleção Genômica, Biometria, Python, R, Conecta GEM, Deep Learning, Keras, TensorFlow, UFV',
        
        'projects-meta-keywords': 'projetos, github, portfólio, R, Python, machine learning, genética', // (Mantido)
        'publications-meta-keywords': 'publicações, artigos, pesquisa, genética, biometria, machine learning, UFV', // (Mantido)
        'privacy-meta-keywords': 'política de privacidade, dados, segurança, contato, formspree', // (Mantido)
    
        // --------------------------------------------------------------------
        // 2. UI GLOBAL (NAVEGAÇÃO, RODAPÉ E ELEMENTOS COMUNS)
        // --------------------------------------------------------------------
        'nav-title-projects': 'Todos os Projetos',
        'nav-title-publications': 'Todas as Publicações',
        'nav-title-privacy': 'Política de Privacidade',
        'back-to-home': '← Voltar para o Início',
        'back-to-top-label': 'Voltar ao topo',
        'footer-title': 'Weverton G. Costa',
        
        // ALTERADO: Alinhado com a nova identidade (PhD, CEO) e remove "agronegócio".
        'footer-bio': 'PhD, CEO e Cientista de Dados focado em aplicar IA e Machine Learning para resolver desafios complexos em Genética.',
        
        'footer-sitemap': 'Mapa do Site',
        'footer-academic-profiles': 'Perfis Acadêmicos',
        'footer-professional-profiles': 'Redes e Perfis',
        'footer-license-text-short': 'Licença CC BY-SA 4.0',
        'privacy-policy': 'Política de Privacidade',
        'footer-location': 'Viçosa - MG, Brasil',
    
        // --------------------------------------------------------------------
        // 3. BOTÕES E AÇÕES GERAIS
        // --------------------------------------------------------------------
        'change-lang-title': 'Mudar para Inglês',
        'clear-btn': 'Limpar',
        'search-btn': 'Buscar',
        'show-more': 'Mostrar mais',
        'show-less': 'Mostrar menos',
        'toggle-details-more': 'Ver mais',
        'toggle-details-less': 'Ver menos',
        'open_btn': 'Ver no GitHub',
        'copy_btn': 'Copiar Link',
        'copied_btn': 'Copiado!',

        // ALTERADO: Texto genérico. A lógica dos 2 botões será implementada depois.
        'download-cv': 'Baixar Currículo',
    
        // --------------------------------------------------------------------
        // 4. DATAS E NOTIFICAÇÕES
        // --------------------------------------------------------------------
        'repo-last-update': 'Última atualização:',
        'footer-update-text': 'Última atualização:',
        'privacy-last-updated': 'Última atualização',
        'emailCopied': 'E-mail copiado para a área de transferência!',
        'emailCopyFailed': 'Falha ao copiar o e-mail.',
    
        // --------------------------------------------------------------------
        // 5. SEÇÃO HERO (TOPO DA PÁGINA INICIAL)
        // --------------------------------------------------------------------
        
        // ALTERADO: Foco na nova identidade CEO + Data Science.
        'subtitle-1': 'CEO & Cofundador da Conecta GEM',
        'subtitle-2': 'Cientista de Dados | Machine Learning',
        'subtitle-3': 'PhD | Genética & Biometria',
        'subtitle-4': 'Especialista em Seleção Genômica', // Mais forte que "Melhoramento 4.0"

        // ALTERADO: Badges atualizados para refletir a nova hierarquia.
        'badge-phd': '🎓 PhD em Genética e Melhoramento',
        'badge-ceo': '🚀 CEO & Cofundador - Conecta GEM',
        'badge-postdoc1': '🔬 Doutorando em Estatística - UFV', // Rebaixado na hierarquia
        'badge-ml': '🤖 Machine Learning Expert', // Mais específico

        // ALTERADO: CTAs (Call to Action) - Um para CV, outro para Contato.
        'cta-projects': 'Ver Projetos', // Mantido (se esta for a chave do botão de projetos)
        'cta-contact': 'Entre em Contato',
        
        // --------------------------------------------------------------------
        // 6. SEÇÕES DE CONTEÚDO (SOBRE, SERVIÇOS, FORMAÇÃO, ETC.)
        // --------------------------------------------------------------------
        'nav-about': 'Sobre', 'nav-experience': 'Atuação', 'nav-services': 'Serviços', 'nav-education': 'Formação', 'nav-projects': 'Projetos', 'nav-publications': 'Publicações', 'nav-skills': 'Habilidades', 'nav-contact': 'Contato',
        
        'about-title': 'Sobre Mim',
        
        // (Texto "Mix" APROVADO - Mantém sua jornada com a otimização de palavras-chave)
        'about-p1': `Minha jornada acadêmica, iniciada na Agronomia pela UFV e aprofundada com mestrado e doutorado em Genética e Melhoramento, proporcionou-me uma base sólida para explorar a fronteira do conhecimento. Hoje, como doutorando em Estatística Aplicada e Biometria, busco integrar modelos avançados à pesquisa agronômica. Essa paixão por inovação culminou na cofundação da <strong>Conecta GEM</strong>, onde atuo como <strong>CEO</strong>, liderando a missão de traduzir a ciência de dados em soluções práticas e inteligentes para o <strong>melhoramento genético</strong>.`,
        'about-p2': `Minha expertise abrange desde a genética quantitativa e seleção genômica até a aplicação de <strong>machine learning</strong> e <strong>redes neurais</strong> para resolver desafios complexos no melhoramento vegetal. Com domínio de softwares como GENES, R e Python, desenvolvo pipelines de análise que garantem precisão e reprodutibilidade, sempre com o objetivo de gerar impacto real no campo e na academia.`,
        'about-p3': `Atuando no Laboratório de Bioinformática da UFV e como <strong>Coordenador Discente no Laboratório de Inteligência Computacional e Aprendizado Estatístico (LICAE)</strong>, tenho a oportunidade de colaborar em pesquisas de ponta e contribuir para a formação de novos cientistas, unindo esforços para avançar as fronteiras da biometria e da inteligência artificial aplicada à <strong>agricultura e melhoramento</strong>.`,

        'services-title': 'Minhas Frentes de Atuação', 
        
        'service-title1': 'Consultoria em Dados e IA', 'service-desc1': 'Ofereço consultoria especializada para instituições de pesquisa e empresas de melhoramento, transformando dados brutos em insights estratégicos e modelos preditivos acionáveis.',
        'service-title2': 'Colaboração Científica', 'service-desc2': 'Estou sempre aberto a novas colaborações em projetos de pesquisa que envolvam genética, melhoramento, biometria e a aplicação de inteligência artificial na agricultura.',
        'service-title3': 'Capacitação e Treinamentos', 'service-desc3': 'Ministro cursos e treinamentos personalizados sobre o uso do software GENES, R, Python, seleção genômica e machine learning para equipes e pesquisadores.',
        
        'education-title': 'Formação Acadêmica',
        
        // (CORRIGIDO: Usando suas chaves originais 'edu-titleX' e 'edu-descX' com os textos otimizados)
        'edu-date1': '2023 - Presente', 'edu-title1': 'Doutorado em Estatística Aplicada e Biometria', 'edu-desc1': 'Conduzindo pesquisa para desenvolver e aplicar novos modelos estatísticos e de machine learning para problemas complexos em biometria.', 'edu-advisor1': '<strong>Orientador:</strong> Prof. Moyses Nascimento.',
        
        'edu-date2': '2023 - Presente', 'edu-title2': 'Pós-Doutorado', 'edu-desc2': 'Pesquisas avançadas aplicando Machine Learning e Deep Learning para aprimorar a acurácia da seleção genômica.', 'edu-advisor2': '<strong>Orientador:</strong> Prof. Moyses Nascimento.',
        
        'edu-date3': '2022 - 2023', 'edu-title3': 'Pós-Doutorado', 'edu-desc3': 'Pesquisa focada em seleção genômica e machine learning, colaborando com diversos projetos de melhoramento genético.', 'edu-advisor3': '<strong>Orientador:</strong> Prof. Moyses Nascimento.', // (Esta é a sua descrição original)

        // (Nota: A chave 'edu-title4' no seu arquivo original estava sendo usada para o Pós-Doc da Embrapa. Vou manter essa estrutura.)
        'edu-title4': 'Pós-Doutorado (Embrapa)', 'edu-desc4': 'Análise de dados (GWS/GWAS) no projeto NextGen Cassava, visando o desenvolvimento de cultivares de mandioca resilientes.', 'edu-advisor4': '<strong>Orientador:</strong> Pesquisador Eder Jorge de Oliveira.',

        'edu-title5': 'Doutorado em Genética e Melhoramento', 'edu-desc5': 'Tese focada no desenvolvimento e validação de Redes Neurais (Deep Learning) para predição genômica. Publicado na CSBJ (FI: 6.0).', 'edu-advisor5': '<strong>Orientador:</strong> Prof. Cosme Damião Cruz. <br><strong>Coorientador:</strong> Prof. Moyses Nascimento.',

        'edu-title6': 'Mestrado em Genética e Melhoramento', 'edu-desc6': 'Dissertação focada na aplicação de Meta-Análise para avaliar parâmetros genéticos em genótipos de arroz irrigado.', 'edu-advisor6': '<strong>Orientador:</strong> Prof. Aluízio Borém de Oliveira. <br><strong>Coorientador:</strong> Prof. Cosme Damião Cruz.',

        'edu-title7': 'Graduação em Agronomia', 'edu-desc7': 'Trabalho de conclusão focado no planejamento experimental e análise de dados para o melhoramento genético de arroz irrigado.', 'edu-advisor7': '<strong>Orientador:</strong> Prof. Plínio César Soares.',
        
        'expertise-title': 'Áreas de Atuação', // (Mantido - Excelente Seção)
        'exp-title1': 'Genética Quantitativa', 'exp-desc1': 'Análise e modelagem de características complexas, estimação de parâmetros genéticos e predição de valores genéticos para otimizar programas de melhoramento.',
        'exp-title2': 'Biometria', 'exp-desc2': 'Aplicação de modelos mistos, Seleção Genômica Ampla (GWS), e GWAS (Estudo de Associação Genômica Ampla) para identificação de marcadores e estudo de características complexas em genética quantitativa.',
        'exp-title3': 'Machine Learning & IA', 'exp-desc3': 'Uso de algoritmos, redes neurais e IA para predição genômica, classificação de genótipos e identificação de padrões em dados biológicos.',
        'exp-title4': 'Pipelines Reprodutíveis', 'exp-desc4': 'Desenvolvimento de pipelines de análise de dados automatizados em R e Python, com versionamento de código e gerenciamento de projetos no GitHub para garantir a reprodutibilidade e a colaboração científica.',
        'exp-title5': 'Melhoramento de Plantas', 'exp-desc5': 'Planejamento e execução de programas de melhoramento, desde a condução de experimentos até a seleção de genótipos superiores com base em dados fenotípicos e genômicos.',
        'exp-title7': 'Softwares e Ferramentas', 'exp-desc7': 'Proficiência em softwares estatísticos como GENES, Selegen, R e Python para Análise de dados genéticos e estatísticos com modelos biométricos, cobrindo desde estatística experimental e biometria até análises multivariadas para estimação de parâmetros genéticos.',
        
        'licae-desc': 'O LICAE é um laboratório multidisciplinar dedicado a propor, avaliar e aplicar técnicas de Inteligência Computacional e Aprendizado Estatístico para solucionar problemas complexos na Agropecuária. Nosso objetivo é aperfeiçoar e complementar as metodologias biométricas tradicionais, desenvolvendo projetos inovadores em áreas como Redes Neurais, Seleção Genômica e Random Forest.',
        'licae-item1': 'Pesquisa em redes neurais e seleção genômica', 'licae-item2': 'Desenvolvimento de modelos preditivos', 'licae-item3': 'Colaboração em projetos multidisciplinares',
        
        'conecta-desc': 'A Conecta GEM nasceu da paixão por compartilhar conhecimento. Somos uma iniciativa que oferece capacitação, consultorias e mentorias de excelência em estatística, genética e melhoramento. Com coordenadores especialistas e uma metodologia focada no aprendizado individual, já qualificamos mais de mil pessoas, conectando a teoria da universidade com a prática do mercado.',
        'conecta-item1': 'Consultoria em biometria e IA', 'conecta-item2': 'Implementação de pipelines de seleção genômica', 'conecta-item3': 'Capacitação e treinamentos em R e Python',
        
        'skills-title': 'Habilidades Técnicas', 'skills-cat-1': 'Softwares', 'skill-name-r': 'R', 'skill-name-python': 'Python', 'skill-name-genes': 'Software GENES', 'skill-name-selegen': 'Software Selegen', 'skills-cat-2': 'Análise & Modelagem', 'skill-name-eda': 'Análise Exploratória de Dados (EDA)', 'skill-name-ml': 'Machine Learning', 'skill-name-deep-learning': 'Deep Learning (Keras/TF)', 'skills-cat-3': 'Biometria', 'skill-name-genomic-sel': 'Seleção Genômica', 'skill-name-mixed-models': 'Modelos Mistos', 'skill-name-quant-gen': 'Genética Quantitativa', 'skill-name-bioinfo': 'Bioinformática', 'skills-cat-4': 'Desenvolvimento e Plataformas', 'skill-name-dataviz': 'Visualização de Dados', 'skill-name-git': 'Git & GitHub', 'skill-name-shiny': 'Aplicações Interativas (Shiny)', 'skill-name-html': 'HTML & CSS',

        // --------------------------------------------------------------------
        // 7. COMPONENTE: PROJETOS
        // --------------------------------------------------------------------
        'projects-title': 'Projetos & Repositórios',
        
        // ALTERADO: Adicionado foco em "IA" e "soluções", não apenas "comunidade".
        'projects-intro': 'Abaixo estão alguns dos meus repositórios públicos. Eles refletem meu trabalho em desenvolvimento de pipelines de análise, estudos em machine learning/IA e a criação de ferramentas reprodutíveis com foco em soluções para Genética e Biometria.',
        
        'search-placeholder': 'Buscar repositório...',
        'no_repos_found': 'Nenhum repositório encontrado com este filtro.',
        'no_description': 'Sem descrição fornecida.',
        'see-all-projects': 'Ver Todos os Projetos',
        'repo-live-site': 'Ver Site',
        'repo-view-repo': 'Repositório',
        'all-projects-title': 'Todos os Projetos & Repositórios',
        'all-projects-intro': 'Explore a lista completa de todos os meus projetos e repositórios públicos. Use a busca abaixo para filtrar por nome, descrição, linguagem ou tópico.',
        'showing_repos': (shown, total) => `Exibindo ${shown} de ${total} repositórios.`,
        'clear-search': 'Limpar busca',
    
        // --------------------------------------------------------------------
        // 8. COMPONENTE: PUBLICAÇÕES
        // --------------------------------------------------------------------
        'publications-title': 'Publicações em Destaque', // ALTERADO: Mais direto.
        
        // ALTERADO: Foco em "Deep Learning" e "validação".
        'publications-intro': 'Minha produção científica foca na validação e aplicação de métodos estatísticos avançados, incluindo Deep Learning e IA, para resolver problemas complexos na genética.',
        
        'search-pub-placeholder': 'Buscar por título, periódico...',
        'metric-label-citations': 'Citações', 'metric-all': 'TODOS', 'metric-since': 'DESDE 2020', 'metric-label-h-index': 'Índice h', 'metric-label-i10-index': 'Índice i10',
        'pub-cited-by': 'Citado', 'pub-cited-by-times': 'vezes', 'pub-no-citation': 'Sem dados de citação', 'pub-published': 'Publicado', 'pub-in': 'em', 'pub-doi': 'DOI',
        'see-all-publications': 'Ver Todas as Publicações',
        'scholar-view-profile': 'Ver Perfil Completo',
        'pub-read': 'Ver publicação →',
        'all-publications-title': 'Todas as Publicações',
        'all-publications-intro': 'Explore a lista completa de minhas publicações científicas. Use a busca abaixo para filtrar por título, periódico ou palavra-chave.',
        'showing_pubs': (shown, total) => `Exibindo ${shown} de ${total} publicações.`,
        'no_pubs_found': 'Nenhuma publicação encontrada com os filtros aplicados.',
        'chart-title': 'Citações e Publicações por Ano', 'chart-title-mobile': 'Citações/Pubs por Ano', 'chart-xaxis-title': 'Ano', 'chart-yaxis-title': 'Número de Citações', 'chart-colorbar-title': 'Nº de Publicações',
        'clear-pub-search': 'Limpar busca de publicações',
    
        // --------------------------------------------------------------------
        // 9. COMPONENTE: FORMULÁRIO DE CONTATO
        // --------------------------------------------------------------------
        'contact-title': 'Vamos Conversar', // ALTERADO: Mais convidativo.
        
        // ALTERADO: Alinhado com a nova identidade (Consultoria, IA, CEO).
        'contact-intro': 'Estou sempre aberto a novas colaborações científicas, consultorias em dados e IA, e oportunidades para gerar impacto através da ciência aplicada. Use o formulário abaixo ou os links rápidos para entrar em contato.',
        
        'contact-quick-links': 'Links Rápidos', 'contact-email-text': 'Email',
        'form-name': 'Nome', 'form-name-ph': 'Seu nome completo', 'form-name-error': 'Por favor, insira seu nome.',
        'form-email': 'Email', 'form-email-ph': 'seu.email@exemplo.com', 'form-email-error': 'Por favor, insira um email válido.',
        'form-subject': 'Assunto', 'form-subject-ph': 'Assunto da sua mensagem', 'form-subject-error': 'Por favor, insira um assunto.',
        'form-message': 'Mensagem', 'form-message-ph': 'Digite sua mensagem aqui...', 'form-message-error': 'Por favor, insira sua mensagem.',
        'form-submit': 'Enviar Mensagem',
        
        'formSending': 'Enviando...', 
        
        // ALTERADO: Mensagem de sucesso mais calorosa.
        'formSuccess': 'Mensagem enviada com sucesso. Obrigado pelo contato!', 
        
        // ALTERADO: Mensagem de erro mais clara.
        'formError': 'Ocorreu um erro ao enviar. Por favor, tente novamente.',

        // --------------------------------------------------------------------
        // 10. PÁGINA DE POLÍTICA DE PRIVACIDADE
        // --------------------------------------------------------------------
        'privacy-title': "Política de Privacidade", 'privacy-intro-title': "1. Introdução", 'privacy-intro-p': "Esta Política de Privacidade descreve como as informações pessoais são coletadas, usadas e compartilhadas quando você visita este site e utiliza o formulário de contato.", 'privacy-collection-title': "2. Coleta de Dados", 'privacy-collection-p1': "As únicas informações pessoais que coletamos são aquelas que você voluntariamente nos fornece através do formulário de contato. Isso inclui:", 'privacy-collection-li1': "Nome", 'privacy-collection-li2': "Endereço de email", 'privacy-collection-li3': "Assunto da mensagem", 'privacy-collection-li4': "Conteúdo da mensagem", 'privacy-collection-p2': "Não utilizamos cookies para rastreamento ou coleta de dados de navegação.", 'privacy-usage-title': "3. Uso de Dados", 'privacy-usage-p': "As informações fornecidas no formulário de contato são utilizadas exclusivamente para a finalidade de responder à sua solicitação ou mensagem. Seus dados não serão armazenados neste site, nem utilizados para fins de marketing ou compartilhados com terceiros, exceto o serviço de processamento de formulários.", 'privacy-services-title': "4. Serviços de Terceiros", 'privacy-services-p': "Este site utiliza os seguintes serviços de terceiros:", 'privacy-services-li1': "Para processar e encaminhar as mensagens enviadas através do formulário de contato para o meu email. A Formspree possui sua própria política de privacidade, que você pode consultar no site deles.", 'privacy-services-li2': "Para a hospedagem deste site.", 'privacy-services-li3': "Para otimização de desempenho e segurança.", 'privacy-security-title': "5. Segurança", 'privacy-security-p': "Embora nenhum método de transmissão pela Internet ou armazenamento eletrônico seja 100% seguro, tomamos precauções razoáveis para proteger suas informações. O tráfego deste site é protegido por HTTPS.", 'privacy-rights-title': "6. Seus Direitos", 'privacy-rights-p': "Você tem o direito de solicitar informações sobre os dados que forneceu e de pedir sua exclusão a qualquer momento, entrando em contato diretamente pelo email <a href='mailto:wevertonufv@gmail.com'>wevertonufv@gmail.com</a>.", 'privacy-changes-title': "7. Alterações na Política", 'privacy-changes-p': "Esta Política de Privacidade pode ser actualizada periodicamente. Recomendamos que você revise esta página ocasionalmente para estar ciente de quaisquer alterações.", 'privacy-contact-title': "8. Contato", 'privacy-contact-p': "Se você tiver alguma dúvida sobre esta Política de Privacidade, entre em contato pelo email <a href='mailto:wevertonufv@gmail.com'>wevertonufv@gmail.com</a>.", 'privacy-back-link': "← Voltar ao site principal",    

        // --------------------------------------------------------------------
        // 11. GERADOR DE PDF (CURRÍCULO)
        // --------------------------------------------------------------------
        'cv-generating': 'Preparando seu currículo...',
        'cv-download-started': 'Download iniciado!',
        'cv-error': 'Ocorreu um erro ao gerar o PDF.',
        
        // ALTERADO: Chaves substituídas para suportar os 2 CVs (Profissional e Acadêmico)
        // O seu utils.js agora irá procurar por estas chaves.
        'cv-file-name-pro': 'CV-Weverton_Costa_Profissional_PT.pdf',
        'cv-file-name-academic': 'CV-Weverton_Gomes_da_Costa_Academico_PT.pdf', 
        
        'pdf-location': 'Viçosa - Minas Gerais - Brasil',
        'pdf-view-site': '[Ver Site]',
        'pdf-view-repo': '[Repositório]',
        'pdf-more-projects': 'Para mais projetos, acesse a página de projetos do site.',
        'pdf-more-publications': 'Para mais publicações, acesse a página de publicações do site.',
        'pdf-cited-by': 'Citado {count} vezes',
        
        // ALTERADO: Títulos internos do PDF alinhados com a nova identidade do site.
        'pdf': {
            'about-title': 'SOBRE MIM',
            'services-title': 'FRENTES DE ATUAÇÃO', // (Matches 'services-title')
            'skills-title': 'HABILIDADES TÉCNICAS', // (Matches 'skills-title')
            'expertise-title': 'ÁREAS DE ATUAÇÃO', // (Matches 'expertise-title')
            'education-title': 'FORMAÇÃO ACADÊMICA', // (Matches 'education-title')
            'projects-title': 'PRINCIPAIS PROJETOS',
            'publications-title': 'PRINCIPAIS PUBLICAÇÕES'
        }
    },
    en: {
        // --------------------------------------------------------------------
        // 1. METADATOS GLOBAIS (PARA SEO E TÍTULOS DE PÁGINA)
        // --------------------------------------------------------------------
        // ALTERADO: Alinhado com o novo Título do LinkedIn.
        'page-title': 'Weverton Gomes da Costa | PhD | CEO | Data Science & AI',
        
        'projects-page-title': 'Projects | Weverton Gomes da Costa',
        'publications-page-title': 'Publications | Weverton Gomes da Costa',
        'privacy-page-title': 'Privacy Policy | Weverton Gomes da Costa',

        // ALTERADO: Substituída a lista de cargos pela nova proposta de valor.
        'meta-description': 'PhD, CEO of Conecta GEM, and Data Scientist. Specialist in translating complex genetics and breeding challenges into practical solutions using AI and Machine Learning.',
        
        // ALTERADO: Adicionado foco em IA e Genética Quantitativa.
        'projects-meta-description': 'Explore Data Science, AI, and Genetics projects by Weverton Gomes da Costa, focusing on Machine Learning and Quantitative Genetics.',
        
        // ALTERADO: Adicionado foco em Deep Learning.
        'publications-meta-description': 'Explore Weverton Gomes da Costa\'s scientific publications, focusing on Deep Learning, Genetics, and Statistical Analysis.',
        
        'privacy-meta-description': 'Privacy Policy for Weverton Gomes da Costa\'s website, detailing data collection and usage.',

        // ALTERADO: Removido "agribusiness". Adicionadas "IA", "CEO", "Conecta GEM".
        'meta-keywords': 'CEO, Data Science, AI, Artificial Intelligence, Machine Learning, Quantitative Genetics, Genomic Selection, Biometrics, Python, R, Conecta GEM, Deep Learning, Keras, TensorFlow, UFV',
        
        'projects-meta-keywords': 'projects, github, portfolio, R, Python, machine learning, genetics',
        'publications-meta-keywords': 'publications, papers, research, genetics, biometrics, machine learning, UFV',
        'privacy-meta-keywords': 'privacy policy, data, security, contact, formspree',

        // --------------------------------------------------------------------
        // 2. UI GLOBAL (NAVEGAÇÃO, RODAPÉ E ELEMENTOS COMUNS)
        // --------------------------------------------------------------------
        'nav-title-projects': 'All Projects',
        'nav-title-publications': 'All Publications',
        'nav-title-privacy': 'Privacy Policy',
        'back-to-home': '← Back to Home',
        'back-to-top-label': 'Back to top',
        'footer-title': 'Weverton G. Costa',
        
        // ALTERADO: Alinhado com a nova identidade (PhD, CEO).
        'footer-bio': 'PhD, CEO, and Data Scientist focused on applying AI and Machine Learning to solve complex challenges in Genetics.',
        
        'footer-sitemap': 'Sitemap',
        'footer-academic-profiles': 'Academic Profiles',
        'footer-professional-profiles': 'Networks & Profiles',
        'footer-license-text-short': 'CC BY-SA 4.0 License',
        'privacy-policy': 'Privacy Policy',
        'footer-location': 'Viçosa - MG, Brazil',

        // --------------------------------------------------------------------
        // 3. BOTÕES E AÇÕES GERAIS
        // --------------------------------------------------------------------
        'change-lang-title': 'Switch to Portuguese',
        'clear-btn': 'Clear',
        'search-btn': 'Search',
        'show-more': 'Show more',
        'show-less': 'Show less',
        'toggle-details-more': 'Show more',
        'toggle-details-less': 'Show less',
        'open_btn': 'View on GitHub',
        'copy_btn': 'Copy Link',
        'copied_btn': 'Copied!',
        
        // ALTERADO: Texto genérico. A lógica dos 2 botões será implementada depois.
        'download-cv': 'Download CV',
    
        // --------------------------------------------------------------------
        // 4. DATAS E NOTIFICAÇÕES
        // --------------------------------------------------------------------
        'repo-last-update': 'Last updated:',
        'footer-update-text': 'Last updated:',
        'privacy-last-updated': 'Last updated',
        'emailCopied': 'Email copied to clipboard!',
        'emailCopyFailed': 'Failed to copy email.',
    
        // --------------------------------------------------------------------
        // 5. SEÇÃO HERO (TOPO DA PÁGINA INICIAL)
        // --------------------------------------------------------------------
        
        // (ALTERADO: Foco na nova identidade CEO + Data Science)
        'subtitle-1': 'CEO & Co-founder of Conecta GEM',
        'subtitle-2': 'Data Scientist | Machine Learning',
        'subtitle-3': 'PhD | Genetics & Biometrics',
        'subtitle-4': 'Genomic Selection Specialist', // Mais forte que "Melhoramento 4.0"

        // (ALTERADO: Badges atualizados para refletir a nova hierarquia)
        'badge-phd': '🎓 PhD in Genetics and Plant Breeding',
        'badge-ceo': '🚀 CEO & Co-founder - Conecta GEM',
        'badge-postdoc1': '🔬 PhD Student in Statistics - UFV', // Rebaixado na hierarquia
        'badge-ml': '🤖 Machine Learning Expert', // Mais específico

        'cta-projects': 'View Projects',
        'cta-contact': 'Get in Touch',
    
        // --------------------------------------------------------------------
        // 6. SEÇÕES DE CONTEÚDO (SOBRE, SERVIÇOS, FORMAÇÃO, ETC.)
        // --------------------------------------------------------------------
        'nav-about': 'About', 'nav-experience': 'Expertise', 'nav-services': 'Services', 'nav-education': 'Education', 'nav-projects': 'Projects', 'nav-publications': 'Publications', 'nav-skills': 'Skills', 'nav-contact': 'Contact',
        
        'about-title': 'About Me',
        
        // (Texto "Mix" APROVADO - Mantém sua jornada com a otimização de palavras-chave)
        'about-p1': `My academic journey, starting in Agronomy at UFV and deepened with a Master's and PhD in Genetics and Plant Breeding, gave me a solid foundation to explore the frontiers of knowledge. Today, as a PhD student in Applied Statistics and Biometrics, I seek to integrate advanced models into agricultural research. This passion for innovation culminated in co-founding <strong>Conecta GEM</strong>, where I serve as <strong>CEO</strong>, leading the mission to translate data science into practical, intelligent solutions for <strong>genetic improvement</strong>.`,
        'about-p2': `My expertise ranges from quantitative genetics and genomic selection to the application of <strong>machine learning</strong> and <strong>neural networks</strong> to solve complex challenges in plant breeding. With proficiency in software like GENES, R, and Python, I develop analysis pipelines that ensure precision and reproducibility, always aiming to generate real impact in the field and academia.`,
        'about-p3': `Working in the Bioinformatics Laboratory at UFV and as a <strong>Student Coordinator at the Computational Intelligence and Statistical Learning Laboratory (LICAE)</strong>, I have the opportunity to collaborate on cutting-edge research and contribute to training new scientists, joining efforts to advance the frontiers of biometrics and artificial intelligence applied to <strong>agriculture and breeding</strong>.`,

        // (ALTERADO: Título mais profissional)
        'services-title': 'My Core Services', 
        
        // (ALTERADO: Foco em "Breeding" em vez de "Agribusiness")
        'service-title1': 'Data & AI Consulting', 'service-desc1': 'I offer specialized consulting for research institutions and <strong>breeding</strong> companies, transforming raw data into strategic insights and actionable predictive models.',
        
        'service-title2': 'Scientific Collaboration', 'service-desc2': 'I am always open to new collaborations on research projects involving genetics, breeding, biometrics, and the application of artificial intelligence in agriculture.',
        'service-title3': 'Training & Workshops', 'service-desc3': 'I provide customized courses and training on the use of GENES software, R, Python, genomic selection, and machine learning for teams and researchers.',
        
        'education-title': 'Academic Education',
        
        // (ALTERADO: Descrições focadas no resultado/tópico, mantendo suas chaves originais)
        'edu-date1': '2023 - Present', 'edu-title1': 'PhD in Applied Statistics and Biometrics', 'edu-desc1': 'Conducting research to develop and apply new statistical and machine learning models for complex problems in biometrics.', 'edu-advisor1': '<strong>Advisor:</strong> Prof. Moyses Nascimento.',
        
        'edu-date2': '2023 - Present', 'edu-title2': 'Postdoctoral Researcher', 'edu-desc2': 'Advanced research applying Machine Learning and Deep Learning to improve the accuracy of genomic selection.', 'edu-advisor2': '<strong>Advisor:</strong> Prof. Moyses Nascimento.',
        
        'edu-date3': '2022 - 2023', 'edu-title3': 'Postdoctoral Researcher', 'edu-desc3': 'Research focused on genomic selection and machine learning, collaborating on various genetic improvement projects.', 'edu-advisor3': '<strong>Advisor:</strong> Prof. Moyses Nascimento.',

        'edu-title4': 'Postdoctoral Researcher (Embrapa)', 'edu-desc4': 'Data analysis (GWS/GWAS) for the NextGen Cassava project, aiming to develop resilient cassava cultivars.', 'edu-advisor4': '<strong>Advisor:</strong> Researcher Eder Jorge de Oliveira.',

        'edu-title5': 'PhD in Genetics and Plant Breeding', 'edu-desc5': 'Thesis focused on the development and validation of Neural Networks (Deep Learning) for genomic prediction. Published in CSBJ (IF: 6.0).', 'edu-advisor5': '<strong>Advisor:</strong> Prof. Cosme Damião Cruz. <br><strong>Co-advisor:</strong> Prof. Moyses Nascimento.',

        'edu-title6': 'MSc in Genetics and Plant Breeding', 'edu-desc6': 'Dissertation focused on applying Meta-Analysis to evaluate genetic parameters in irrigated rice genotypes.', 'edu-advisor6': '<strong>Advisor:</strong> Prof. Aluízio Borém de Oliveira. <br><strong>Co-advisor:</strong> Prof. Cosme Damião Cruz.',

        'edu-title7': 'BSc in Agronomy', 'edu-desc7': 'Final project focused on experimental design and data analysis for irrigated rice genetic improvement.', 'edu-advisor7': '<strong>Advisor:</strong> Prof. Plínio César Soares.',
        
        'expertise-title': 'Areas of Expertise',
        'exp-title1': 'Quantitative Genetics', 'exp-desc1': 'Analysis and modeling of complex traits, estimation of genetic parameters, and prediction of genetic values to optimize breeding programs.',
        'exp-title2': 'Biometrics', 'exp-desc2': 'Application of mixed models, Genome-Wide Selection (GWS), and GWAS (Genome-Wide Association Study) for marker identification and the study of complex traits.',
        'exp-title3': 'Machine Learning & AI', 'exp-desc3': 'Use of algorithms, neural networks, and AI for genomic prediction, genotype classification, and pattern identification in biological data.',
        'exp-title4': 'Reproducible Pipelines', 'exp-desc4': 'Development of automated data analysis pipelines in R and Python, with code versioning and project management on GitHub to ensure reproducibility and scientific collaboration.',
        'exp-title5': 'Plant Breeding', 'exp-desc5': 'Planning and execution of breeding programs, from conducting experiments to selecting superior genotypes based on phenotypic and genomic data.',
        'exp-title7': 'Software and Tools', 'exp-desc7': 'Proficiency in statistical software such as GENES, Selegen, R, and Python for genetic and statistical data analysis with biometric models, covering experimental statistics, biometrics, and multivariate analyses.',
        
        'licae-desc': 'LICAE is a multidisciplinary lab dedicated to proposing, evaluating, and applying Computational Intelligence and Statistical Learning techniques to solve complex problems in Agriculture. Our goal is to enhance and complement traditional biometric methodologies by developing innovative projects in areas like Neural Networks, Genomic Selection, and Random Forest.',
        'licae-item1': 'Research in neural networks and genomic selection', 'licae-item2': 'Development of predictive models', 'licae-item3': 'Collaboration on multidisciplinary projects',
        
        'conecta-desc': 'Conecta GEM was born from a passion for sharing knowledge. We are an initiative that offers high-quality training, consulting, and mentoring in statistics, genetics, and breeding. With expert coordinators and a methodology focused on individual learning, we have already qualified over a thousand people, connecting university theory with market practice.',
        'conecta-item1': 'Consulting in biometrics and AI', 'conecta-item2': 'Implementation of genomic selection pipelines', 'conecta-item3': 'Training in R and Python',
        
        'skills-title': 'Technical Skills', 'skills-cat-1': 'Software', 'skill-name-r': 'R', 'skill-name-python': 'Python', 'skill-name-genes': 'GENES Software', 'skill-name-selegen': 'Selegen Software', 'skills-cat-2': 'Analysis & Modeling', 'skill-name-eda': 'Exploratory Data Analysis (EDA)', 'skill-name-ml': 'Machine Learning', 'skill-name-deep-learning': 'Deep Learning (Keras/TF)', 'skills-cat-3': 'Biometrics', 'skill-name-genomic-sel': 'Genomic Selection', 'skill-name-mixed-models': 'Mixed Models', 'skill-name-quant-gen': 'Quantitative Genetics', 'skill-name-bioinfo': 'Bioinformatics', 'skills-cat-4': 'Development & Platforms', 'skill-name-dataviz': 'Data Visualization', 'skill-name-git': 'Git & GitHub', 'skill-name-shiny': 'Interactive Apps (Shiny)', 'skill-name-html': 'HTML & CSS',

        // --------------------------------------------------------------------
        // 7. COMPONENTE: PROJETOS
        // --------------------------------------------------------------------
        'projects-title': 'Projects & Repositories',
        
        // ALTERADO: Foco em "IA" e "soluções".
        'projects-intro': 'Below are some of my public repositories. They reflect my work in developing analysis pipelines, studies in machine learning/AI, and creating reproducible tools focused on solutions for Genetics and Biometrics.',
        
        'search-placeholder': 'Search repositories...',
        'no_repos_found': 'No repositories found with this filter.',
        'no_description': 'No description provided.',
        'see-all-projects': 'See All Projects',
        'repo-live-site': 'View Site',
        'repo-view-repo': 'Repository',
        'all-projects-title': 'All Projects & Repositories',
        'all-projects-intro': 'Explore the complete list of all my public projects and repositories. Use the search below to filter by name, description, language, or topic.',
        'showing_repos': (shown, total) => `Showing ${shown} of ${total} repositories.`,
        'clear-search': 'Clear search',
    
        // --------------------------------------------------------------------
        // 8. COMPONENTE: PUBLICAÇÕES
        // --------------------------------------------------------------------
        'publications-title': 'Featured Publications', // ALTERADO: Mais direto.
        
        // ALTERADO: Foco em "Deep Learning" e "validação".
        'publications-intro': 'My scientific production focuses on the validation and application of advanced statistical methods, including Deep Learning and AI, to solve complex problems in genetics.',
        
        'search-pub-placeholder': 'Search by title, journal...',
        'metric-label-citations': 'Citations', 'metric-all': 'ALL', 'metric-since': 'SINCE 2020', 'metric-label-h-index': 'h-index', 'metric-label-i10-index': 'i10-index',
        'pub-cited-by': 'Cited', 'pub-cited-by-times': 'times', 'pub-no-citation': 'No citation data', 'pub-published': 'Published', 'pub-in': 'in', 'pub-doi': 'DOI',
        'see-all-publications': 'See All Publications',
        'scholar-view-profile': 'View Full Profile',
        'pub-read': 'View publication →',
        'all-publications-title': 'All Publications',
        'all-publications-intro': 'Explore the complete list of my scientific publications. Use the search below to filter by title, journal, or keyword.',
        'showing_pubs': (shown, total) => `Showing ${shown} of ${total} publications.`,
        'no_pubs_found': 'No publications found with the applied filters.',
        'chart-title': 'Citations and Publications per Year', 'chart-title-mobile': 'Cites/Pubs per Year', 'chart-xaxis-title': 'Year', 'chart-yaxis-title': 'Number of Citations', 'chart-colorbar-title': 'Nº of Publications',
        'clear-pub-search': 'Clear publications search',

        // --------------------------------------------------------------------
        // 9. COMPONENTE: FORMULÁRIO DE CONTATO
        // --------------------------------------------------------------------
        'contact-title': 'Let\'s Talk', // ALTERADO: Mais convidativo.
        
        // ALTERADO: Alinhado com a nova identidade (Consultoria, IA, CEO).
        'contact-intro': 'I am always open to new scientific collaborations, data & AI consulting, and opportunities to generate impact through applied science. Use the form below or the quick links to get in touch.',
        
        'contact-quick-links': 'Quick Links', 'contact-email-text': 'Email',
        'form-name': 'Name', 'form-name-ph': 'Your full name', 'form-name-error': 'Please enter your name.',
        'form-email': 'Email', 'form-email-ph': 'your.email@example.com', 'form-email-error': 'Please enter a valid email.',
        'form-subject': 'Subject', 'form-subject-ph': 'Subject of your message', 'form-subject-error': 'Please enter a subject.',
        'form-message': 'Message', 'form-message-ph': 'Type your message here...', 'form-message-error': 'Please enter your message.',
        'form-submit': 'Send Message',
        
        'formSending': 'Sending...',
        
        // ALTERADO: Mensagem de sucesso mais calorosa.
        'formSuccess': 'Message sent successfully. Thank you for getting in touch!', 
        
        // ALTERADO: Mensagem de erro mais clara.
        'formError': 'An error occurred while sending. Please try again.',

        // --------------------------------------------------------------------
        // 10. PÁGINA DE POLÍTICA DE PRIVACIDADE
        // --------------------------------------------------------------------
        'privacy-title': "Privacy Policy", 'privacy-intro-title': "1. Introduction", 'privacy-intro-p': "This Privacy Policy describes how personal information is collected, used, and shared when you visit this website and use the contact form.", 'privacy-collection-title': "2. Data Collection", 'privacy-collection-p1': "The only personal information we collect is what you voluntarily provide to us through the contact form. This includes:", 'privacy-collection-li1': "Name", 'privacy-collection-li2': "Email address", 'privacy-collection-li3': "Message subject", 'privacy-collection-li4': "Message content", 'privacy-collection-p2': "We do not use cookies for tracking or collecting browsing data.", 'privacy-usage-title': "3. Use of Data", 'privacy-usage-p': "The information provided in the contact form is used exclusively for the purpose of responding to your request or message. Your data will not be stored on this site, used for marketing purposes, or shared with third parties, except for the form processing service.", 'privacy-services-title': "4. Third-Party Services", 'privacy-services-p': "This site uses the following third-party services:", 'privacy-services-li1': "To process and forward messages sent via the contact form to my email. Formspree has its own privacy policy, which you can consult on their website.", 'privacy-services-li2': "For hosting this website.", 'privacy-services-li3': "For performance optimization and security.", 'privacy-security-title': "5. Security", 'privacy-security-p': "While no method of transmission over the Internet or electronic storage is 100% secure, we take reasonable precautions to protect your information. This site's traffic is protected by HTTPS.", 'privacy-rights-title': "6. Your Rights", 'privacy-rights-p': "You have the right to request information about the data you have provided and to ask for its deletion at any time by contacting me directly at <a href='mailto:wevertonufv@gmail.com'>wevertonufv@gmail.com</a>.", 'privacy-changes-title': "7. Changes to the Policy", 'privacy-changes-p': "This Privacy Policy may be updated periodically. We recommend that you review this page occasionally to be aware of any changes.", 'privacy-contact-title': "8. Contact", 'privacy-contact-p': "If you have any questions about this Privacy Policy, please contact me at <a href='mailto:wevertonufv@gmail.com'>wevertonufv@gmail.com</a>.", 'privacy-back-link': "← Back to the main site",

        // --------------------------------------------------------------------
        // 11. GERADOR DE PDF (CURRÍCULO)
        // --------------------------------------------------------------------
        'cv-generating': 'Preparing your CV...',
        'cv-download-started': 'Download started!',
        'cv-error': 'An error occurred while generating the PDF.',
        
        // ALTERADO: Chaves para suportar os 2 CVs (Profissional e Acadêmico)
        'cv-file-name-pro': 'CV-Weverton_Costa_Professional_EN.pdf',
        'cv-file-name-academic': 'CV-Weverton_Gomes_da_Costa_Academic_EN.pdf', 
        
        'pdf-location': 'Viçosa - Minas Gerais - Brazil',
        'pdf-view-site': '[View Site]',
        'pdf-view-repo': '[Repository]',
        'pdf-more-projects': 'For more projects, visit the projects page on the website.',
        'pdf-more-publications': 'For more publications, visit the publications page on the website.',
        'pdf-cited-by': 'Cited {count} times',
        
        // ALTERADO: Títulos internos do PDF alinhados com a nova identidade do site.
        'pdf': {
            'about-title': 'ABOUT ME',
            'services-title': 'CORE SERVICES', // (Matches 'services-title')
            'skills-title': 'TECHNICAL SKILLS', // (Matches 'skills-title')
            'expertise-title': 'AREAS OF EXPERTISE', // (Matches 'expertise-title')
            'education-title': 'ACADEMIC EDUCATION', // (Matches 'education-title')
            'projects-title': 'FEATURED PROJECTS',
            'publications-title': 'FEATURED PUBLICATIONS'
        }
    }
  
};

// =================================================================================
// MÓDULO PRINCIPAL DA APLICAÇÃO (UI & Interações)
// Controla a inicialização de eventos, animações e interações do usuário.
// =================================================================================

const App = {
    UI: { // Cache para elementos do DOM
        nav: null,
        header: null,
        body: null,
        backToTopButton: null,
        timeline: null,
        copyEmailLink: null,
        toast: null
    },

    /**
     * Ponto de entrada principal da aplicação.
     */
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this._cacheDOMElements();
            this._initSetup();
            LanguageManager.setLanguage('pt'); // Define o idioma inicial e renderiza tudo
        });
    },

    /**
     * Armazena referências a elementos do DOM para evitar buscas repetidas.
     */
    _cacheDOMElements() {
        this.UI.nav = document.querySelector('nav');
        this.UI.header = document.querySelector('header');
        this.UI.body = document.body;
        this.UI.backToTopButton = document.querySelector('.back-to-top');
        this.UI.timeline = document.querySelector('.timeline');
        this.UI.copyEmailLink = document.getElementById('copy-email-link');
        this.UI.toast = document.getElementById('toast-notification');
    },

    /**
     * Orquestra a configuração de observadores e listeners.
     */
    _initSetup() {
        this._setupObservers();
        this._setupEventListeners();
    },

    // --- Configuração de Observadores (Animações de Scroll) ---
    _setupObservers() {
        this._setupRevealObserver();
        this._setupSkillObserver();
        this._setupNavObserver();
        this._setupStaggerEffect();
    },

    _setupRevealObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add('visible');
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    },

    _setupSkillObserver() {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    const level = entry.target.dataset.level;
                    const bar = entry.target.querySelector('.skill-bar');
                    if (bar && level) {
                        bar.style.setProperty('--proficiency-level', level);
                    }
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        document.querySelectorAll('.skill-item').forEach(el => observer.observe(el));
    },

    _setupNavObserver() {
        const sections = document.querySelectorAll('main > section[id]');
        const navLinks = document.querySelectorAll('nav .nav-link');
        const observer = new IntersectionObserver((entries) => {
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
        sections.forEach(section => observer.observe(section));
    },

    _setupStaggerEffect() {
        document.querySelectorAll('.stagger-children').forEach(container => {
            container.querySelectorAll('.reveal, .skill-item').forEach((child, index) => {
                child.style.setProperty('--stagger-index', index);
            });
        });
    },

    // --- Configuração de Listeners de Eventos ---
    _setupEventListeners() {
        window.addEventListener('scroll', this._handleScroll.bind(this), { passive: true });
        this.UI.body.addEventListener('mousemove', this._handleCardHover.bind(this));

        if (this.UI.timeline) {
            this.UI.timeline.addEventListener('click', this._handleTimelineToggle.bind(this));
        }
        if (this.UI.copyEmailLink) {
            this.UI.copyEmailLink.addEventListener('click', this._handleEmailCopy.bind(this));
        }
    },

    // --- Manipuladores de Eventos (Handlers) ---
    _handleScroll() {
        const scrollY = window.scrollY;
        
        if (this.UI.nav) {
            const isScrolled = this.UI.header 
                ? scrollY > this.UI.header.offsetHeight - 100 
                : scrollY > 50;
            this.UI.nav.classList.toggle('scrolled', isScrolled);
            if (this.UI.header) this.UI.body.classList.toggle('scrolled', isScrolled);
        }

        if (this.UI.backToTopButton) {
            this.UI.backToTopButton.classList.toggle('visible', scrollY > 300);
        }
    },

    _handleCardHover(event) {
        const card = event.target.closest('.card');
        if (card) {
            const rect = card.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        }
    },

    _handleTimelineToggle(event) {
        const button = event.target.closest('.toggle-details-btn');
        if (!button) return;

        const item = button.closest('.timeline-item');
        item.classList.toggle('expanded');

        const lang = LanguageManager.currentLang;
        const moreText = translations[lang]['toggle-details-more'] || 'Ver mais';
        const lessText = translations[lang]['toggle-details-less'] || 'Ver menos';
        
        button.textContent = item.classList.contains('expanded') ? lessText : moreText;

        const details = item.querySelector('.timeline-details');
        if (item.classList.contains('expanded') && details.dataset.key) {
            details.innerHTML = translations[lang][details.dataset.key] || '';
        }
    },

    _handleEmailCopy(event) {
        event.preventDefault();
        const emailToCopy = 'wevertonufv@gmail.com';
        navigator.clipboard.writeText(emailToCopy)
            .then(() => this.showToast(`Email: ${emailToCopy} copiado!`))
            .catch(err => {
                console.error('Falha ao copiar email: ', err);
                this.showToast('Falha ao copiar o email.');
            });
    },

    // --- Funções Utilitárias ---
    showToast(message) {
        if (this.UI.toast) {
            this.UI.toast.textContent = message;
            this.UI.toast.classList.add('show');
            setTimeout(() => this.UI.toast.classList.remove('show'), 3000);
        }
    },
};

// =================================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// =================================================================================

App.init();