/**
 * @file fallback-data.js
 * @description Contém dados estáticos de fallback para os repositórios do GitHub e publicações do Scholar.
 * Este arquivo deve ser carregado ANTES de utils.js para que o objeto `fallbackData` esteja disponível globalmente.
 * @version 1.0.0
 */

window.fallbackData = {
    /**
     * Fallback para os repositórios do GitHub.
     * Extraído do PDF "Your Repositories.pdf".
     */
    githubRepos: [
        {
            name: "Genomic-Selection-for-Drought-Tolerance-Using-Genome-Wide-SNPs-in-Casava",
            html_url: "https://github.com/WevertonGomesCosta/Genomic-Selection-for-Drought-Tolerance-Using-Genome-Wide-SNPs-in-Casava",
            description: "This website is a project for analysis of the Genomic Selection for Drought Tolerance Using Genome Wide GBS and/or DART in Cassava by EMBRAPA Mandioca.",
            language: "R",
            stargazers_count: 2,
            forks_count: 0,
            updated_at: "2025-10-06T18:00:00Z",
            topics: ["eda", "multi-environment", "cassava", "genomic-selection", "mixed-models", "single-environment"]
        },
        {
            name: "Genetic-diversity-and-interaction-between-the-maintainers-of-commercial-Soybean-cultivars-using-self",
            html_url: "https://github.com/WevertonGomesCosta/Genetic-diversity-and-interaction-between-the-maintainers-of-commercial-Soybean-cultivars-using-self",
            description: "Reproducible R workflow for analyzing genetic diversity and interactions among maintainers of commercial soybean cultivars, integrating Random Forest, Multiple Correspondence Analysis (MCA), and Se...",
            language: "R",
            stargazers_count: 1,
            forks_count: 0,
            updated_at: "2025-10-06T18:00:00Z",
            topics: ["r", "random-forest", "som", "genetic-diversity", "mca", "soybean"]
        },
        {
            name: "Bovine-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow",
            html_url: "https://github.com/WevertonGomesCosta/Bovine-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow",
            description: "Projeto de visão computacional que utiliza Mask R-CNN com Keras e TensorFlow para segmentar bovinos em imagens, extrair medidas morfométricas (área, perímetro, comprimento e largura) e estimar o pe...",
            language: "Python",
            stargazers_count: 1,
            forks_count: 1,
            updated_at: "2025-10-06T18:00:00Z",
            topics: ["opencv", "machine-learning", "computer-vision", "deep-learning", "tensorflow", "keras"]
        },
        {
            name: "Machine-learning-e-redes-neurais-artificiais-no-melhoramento-genetico-do-cafeeiro",
            html_url: "https://github.com/WevertonGomesCosta/Machine-learning-e-redes-neurais-artificiais-no-melhoramento-genetico-do-cafeeiro",
            description: "Este repositório desenvolve e compara métodos de machine learning e redes neurais artificiais para aprimorar a seleção genômica ampla (GWS) em Coffea arabica e identificar marcadores SNP informativ...",
            language: "R",
            stargazers_count: 0,
            forks_count: 0,
            updated_at: "2025-08-01T12:00:00Z",
            topics: ["machine-learning", "neural-network", "genetics", "breeding", "coffee"]
        },
        {
            name: "Integrating-nir-genomic-kernel",
            html_url: "https://github.com/WevertonGomesCosta/Integrating-nir-genomic-kernel",
            description: "Demonstrar que a fusão de dados espectrais e genômicos pode aumentar significativamente a acurácia da predição fenotípica, contribuindo para decisões mais eficientes em programas de seleção",
            language: "R",
            stargazers_count: 0,
            forks_count: 0,
            updated_at: "2025-09-13T12:00:00Z",
            topics: []
        }
    ],

    /**
     * Fallback para as publicações e métricas do Scholar.
     * Extraído dos PDFs do ORCID e Google Acadêmico.
     */
    scholarData: {
        profile: {
            cited_by: {
                table: [
                    { citations: { all: 148, since_2020: 145 } },
                    { h_index: { all: 7, since_2020: 7 } },
                    { i10_index: { all: 5, since_2020: 5 } }
                ]
            }
        },
        articles: [
            {
                title: "Recommendation of Coffea arabica genotypes by factor analysis",
                doi: "10.1007/S10681-019-2499-X",
                doiLink: "https://doi.org/10.1007/S10681-019-2499-X",
                year: "2019",
                journalTitle: "Euphytica",
                link: "https://doi.org/10.1007/S10681-019-2499-X",
                cited_by: { value: 35 }
            },
            {
                title: "Genomic prediction through machine learning and neural networks for traits with epistasis",
                doi: "10.1016/J.CSBJ.2022.09.029",
                doiLink: "https://doi.org/10.1016/J.CSBJ.2022.09.029",
                year: "2022",
                journalTitle: "Computational and Structural Biotechnology Journal",
                link: "https://doi.org/10.1016/J.CSBJ.2022.09.029",
                cited_by: { value: 15 }
            },
            {
                title: "Genome-enabled prediction through machine learning methods considering different levels of trait complexity",
                doi: "10.1002/CSC2.20488",
                doiLink: "https://doi.org/10.1002/CSC2.20488",
                year: "2021",
                journalTitle: "Crop Science",
                link: "https://doi.org/10.1002/CSC2.20488",
                cited_by: { value: 14 }
            },
            {
                title: "Machine learning and statistics to qualify environments through multi-traits in Coffea arabica",
                doi: "10.1371/JOURNAL.PONE.0245298",
                doiLink: "https://doi.org/10.1371/JOURNAL.PONE.0245298",
                year: "2021",
                journalTitle: "PLOS ONE",
                link: "https://doi.org/10.1371/JOURNAL.PONE.0245298",
                cited_by: { value: 12 }
            },
            {
                title: "Optimizing drought tolerance in cassava through genomic selection",
                doi: "10.3389/FPLS.2024.1483340",
                doiLink: "https://doi.org/10.3389/FPLS.2024.1483340",
                year: "2024",
                journalTitle: "FRONTIERS IN PLANT SCIENCE",
                link: "https://doi.org/10.3389/FPLS.2024.1483340",
                cited_by: { value: 2 }
            },
            {
                title: "Genetic diversity and interaction between the maintainers of commercial soybean cultivars using self-organizing maps",
                doi: "10.1002/CSC2.20816",
                doiLink: "https://doi.org/10.1002/CSC2.20816",
                year: "2022",
                journalTitle: "Crop Science",
                link: "https://doi.org/10.1002/CSC2.20816",
                cited_by: { value: 5 }
            }
        ]
    }
};
