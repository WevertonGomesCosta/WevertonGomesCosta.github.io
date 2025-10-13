/**
 * @file fallback-data.js
 * @description Contém dados estáticos de fallback para os repositórios do GitHub e publicações do Scholar.
 * Este arquivo deve ser carregado ANTES de utils.js para que o objeto `fallbackData` esteja disponível globalmente.
 * @version 3.0.0
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
            name: "analisys-next-gen-2022",
            html_url: "https://github.com/WevertonGomesCosta/analisys-next-gen-2022",
            description: "Repositório com código e relatórios reprodutíveis do programa de melhoramento de mandioca da Embrapa no âmbito do NextGen Cassava (Year 6-2022/2023).",
            language: "R",
            stargazers_count: 0,
            forks_count: 0,
            updated_at: "2025-10-05T18:00:00Z",
            topics: ["genomic-selection", "heritability", "plant-breeding", "drought-tolerance", "selection-index", "field-trials"]
        },
        {
            name: "Genetic-diversity-and-interaction-between-the-maintainers-of-commercial-Soybean-cultivars-using-self",
            html_url: "https://github.com/WevertonGomesCosta/Genetic-diversity-and-interaction-between-the-maintainers-of-commercial-Soybean-cultivars-using-self",
            description: "Reproducible R workflow for analyzing genetic diversity and interactions among maintainers of commercial soybean cultivars, integrating Random Forest, Multiple Correspondence Analysis (MCA), and Se...",
            language: "R",
            stargazers_count: 1,
            forks_count: 0,
            updated_at: "2025-10-04T18:00:00Z",
            topics: ["r", "random-forest", "som", "genetic-diversity", "mca", "soybean"]
        },
        {
            name: "cassavabaseembrapa",
            html_url: "https://github.com/WevertonGomesCosta/cassavabaseembrapa",
            description: "Este repositório contém scripts em R para automatizar o processo de inserção de ensaios de mandioca (Manihot esculenta) na plataforma CassavaBase, em colaboração com a EMBRAPA Mandioca e Fruticultu...",
            language: "R",
            stargazers_count: 0,
            forks_count: 0,
            updated_at: "2025-10-03T18:00:00Z",
            topics: ["machine-learning", "bioinformatics", "statistics", "genomics", "genetic-analysis", "cassava"]
        },
        {
            name: "Bovine-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow",
            html_url: "https://github.com/WevertonGomesCosta/Bovine-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow",
            description: "Projeto de visão computacional que utiliza Mask R-CNN com Keras e TensorFlow para segmentar bovinos em imagens, extrair medidas morfométricas (área, perímetro, comprimento e largura) e estimar o pe...",
            language: "Python",
            stargazers_count: 1,
            forks_count: 1,
            updated_at: "2025-10-02T18:00:00Z",
            topics: ["opencv", "machine-learning", "computer-vision", "deep-learning", "tensorflow", "keras"]
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
            name: "Importance-of-markers-for-QTL-detection-by-machine-learning-methods",
            html_url: "https://github.com/WevertonGomesCosta/Importance-of-markers-for-QTL-detection-by-machine-learning-methods",
            description: "This Script is part of the article Machine Learning in Genome-Wide Association Studies for Complex Traits. Costa, W. G.et al. 2025",
            language: "HTML",
            stargazers_count: 0,
            forks_count: 0,
            updated_at: "2025-07-29T12:00:00Z",
            topics: ["machine-learning", "gwas", "neural-network", "mars", "splines", "genomic-wide-association-studies"]
        },
        {
            name: "Genomic-prediction-through-machine-learning-and-neural-networks-for-traits-with-epistasis",
            html_url: "https://github.com/WevertonGomesCosta/Genomic-prediction-through-machine-learning-and-neural-networks-for-traits-with-epistasis",
            description: "This Script is part of the article Genomic prediction through machine learning and neural networks for traits with epistasis. Costa, W. G.et al. 2022",
            language: "R",
            stargazers_count: 0,
            forks_count: 0,
            updated_at: "2024-03-25T12:00:00Z",
            topics: []
        },
        {
            name: "GitHub-with-RStudio-LICAE",
            html_url: "https://github.com/WevertonGomesCosta/GitHub-with-RStudio-LICAE",
            description: "Manual: Integrando o GitHub com o Rstudio. Bem-vindo! Esse manual irá ensinar como realizar todo o processo de criação de um repositório no GitHub até a integração do GitHub com o RStudio, visando ...",
            language: "R",
            stargazers_count: 0,
            forks_count: 0,
            updated_at: "2024-03-13T12:00:00Z",
            topics: []
        },
        {
            name: "Genomic-Selection_Course",
            html_url: "https://github.com/WevertonGomesCosta/Genomic-Selection_Course",
            description: "Minicourse 'Application of genomic selection to data from multiple environments' with Professor PhD Kaio Dias in XIII SIGM by GENMELHOR.",
            language: "R",
            stargazers_count: 0,
            forks_count: 0,
            updated_at: "2023-10-28T12:00:00Z",
            topics: ["genomics", "multi-environment", "genomic-selection", "genomic-wide-selection", "single-environment"]
        },
        {
            name: "Diversidade-gen-tica-e-identifica-o-de-regi-es-gen-micas-associadas-ao-tamanho-dos-gr-nulos-de-amid",
            html_url: "https://github.com/WevertonGomesCosta/Diversidade-gen-tica-e-identifica-o-de-regi-es-gen-micas-associadas-ao-tamanho-dos-gr-nulos-de-amid",
            description: "Este projeto visa explorar a diversidade genética da mandioca e identificar regiões específicas do DNA associadas ao tamanho dos grânulos de amido. Através de análises genômicas avançadas, buscamos...",
            language: "R",
            stargazers_count: 0,
            forks_count: 0,
            updated_at: "2023-06-07T12:00:00Z",
            topics: ["cassava", "mandioca", "diversidade-genetica", "analise-genomica", "associacao-genomica"]
        },
        {
            name: "Genomic-Prediction-using-Regularized-Artificial-Neural-Networks",
            html_url: "https://github.com/WevertonGomesCosta/Genomic-Prediction-using-Regularized-Artificial-Neural-Networks",
            description: "O objetivo do presente projeto é propor e avaliar o uso da regularização no desempenho de RNAs em modelos de predição genômica (GP). Tal estudo visa melhorar a predição de valores genéticos genômic...",
            language: "R",
            stargazers_count: 0,
            forks_count: 0,
            updated_at: "2023-06-01T12:00:00Z",
            topics: []
        },
        {
            name: "Manipulacao-dados-e-Analise-Grafica-R",
            html_url: "https://github.com/WevertonGomesCosta/Manipulacao-dados-e-Analise-Grafica-R",
            description: null,
            language: "R",
            stargazers_count: 0,
            forks_count: 0,
            updated_at: "2023-05-18T12:00:00Z",
            topics: []
        },
        {
            name: "Pig-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow",
            html_url: "https://github.com/WevertonGomesCosta/Pig-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow",
            description: "Mask R-CNN for object detection and instance segmentation on Keras and TensorFlow",
            language: "Python",
            stargazers_count: 0,
            forks_count: 3,
            updated_at: "2023-04-20T12:00:00Z",
            topics: []
        },
        {
            name: "curso-git-github",
            html_url: "https://github.com/WevertonGomesCosta/curso-git-github",
            description: null,
            language: "Python",
            stargazers_count: 0,
            forks_count: 0,
            updated_at: "2023-04-12T12:00:00Z",
            topics: []
        },
        {
            name: "Prediction-of-trait-through-computational-intelligence-and-machine-learning-applied-to-improvement-o",
            html_url: "https://github.com/WevertonGomesCosta/Prediction-of-trait-through-computational-intelligence-and-machine-learning-applied-to-improvement-o",
            description: null,
            language: "R",
            stargazers_count: 0,
            forks_count: 0,
            updated_at: "2022-12-14T12:00:00Z",
            topics: []
        },
        {
            name: "Treinamento-GEFERT",
            html_url: "https://github.com/WevertonGomesCosta/Treinamento-GEFERT",
            description: null,
            language: null,
            stargazers_count: 0,
            forks_count: 0,
            updated_at: "2022-10-20T12:00:00Z",
            topics: []
        }
    ],

    /**
     * Fallback para as publicações e métricas do Scholar.
     * Extraído e combinado dos PDFs do ORCID e Google Acadêmico.
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
                journalTitle: "EUPHYTICA",
                link: "https://doi.org/10.1007/S10681-019-2499-X",
                cited_by: { value: 35 }
            },
            {
                title: "Genomic prediction through machine learning and neural networks for traits with epistasis",
                doi: "10.1016/J.CSBJ.2022.09.029",
                doiLink: "https://doi.org/10.1016/J.CSBJ.2022.09.029",
                year: "2022",
                journalTitle: "COMPUTATIONAL AND STRUCTURAL BIOTECHNOLOGY JOURNAL",
                link: "https://doi.org/10.1016/J.CSBJ.2022.09.029",
                cited_by: { value: 15 }
            },
            {
                title: "Genome-enabled prediction through machine learning methods considering different levels of trait complexity",
                doi: "10.1002/CSC2.20488",
                doiLink: "https://doi.org/10.1002/CSC2.20488",
                year: "2021",
                journalTitle: "CROP SCIENCE",
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
                title: "Very Early Biomarkers Screening for Water Deficit Tolerance in Commercial Eucalyptus Clones",
                doi: "10.3390/AGRONOMY13030937",
                doiLink: "https://doi.org/10.3390/AGRONOMY13030937",
                year: "2023",
                journalTitle: "AGRONOMY-BASEL",
                link: "https://doi.org/10.3390/AGRONOMY13030937",
                cited_by: { value: 11 }
            },
            {
                title: "Methods of adaptability and stability applied to the improvement of flooded rice",
                doi: "10.4238/GMR18434",
                doiLink: "https://doi.org/10.4238/GMR18434",
                year: "2020",
                journalTitle: "GENETICS AND MOLECULAR RESEARCH",
                link: "https://doi.org/10.4238/GMR18434",
                cited_by: { value: 9 }
            },
            {
                title: "Body weight prediction in crossbred pigs from digital images using computer vision",
                doi: "10.1016/J.LIVSCI.2024.105433",
                doiLink: "https://doi.org/10.1016/J.LIVSCI.2024.105433",
                year: "2024",
                journalTitle: "LIVESTOCK SCIENCE",
                link: "https://doi.org/10.1016/J.LIVSCI.2024.105433",
                cited_by: { value: 7 }
            },
            {
                title: "Metabolic, nutritional and morphophysiological behavior of eucalypt genotypes differing in dieback resistance in field when submitted to PEG-induced water deficit",
                doi: "10.3390/AGRONOMY13051261",
                doiLink: "https://doi.org/10.3390/AGRONOMY13051261",
                year: "2023",
                journalTitle: "AGRONOMY-BASEL",
                link: "https://doi.org/10.3390/AGRONOMY13051261",
                cited_by: { value: 6 }
            },
            {
                title: "Multiple-trait model through Bayesian inference applied to flood-irrigated rice (Oryza sativa L)",
                doi: "10.1007/S10681-022-03077-X",
                doiLink: "https://doi.org/10.1007/S10681-022-03077-X",
                year: "2022",
                journalTitle: "EUPHYTICA",
                link: "https://doi.org/10.1007/S10681-022-03077-X",
                cited_by: { value: 6 }
            },
            {
                title: "Genetic diversity and interaction between the maintainers of commercial soybean cultivars using self-organizing maps",
                doi: "10.1002/CSC2.20816",
                doiLink: "https://doi.org/10.1002/CSC2.20816",
                year: "2022",
                journalTitle: "CROP SCIENCE",
                link: "https://doi.org/10.1002/CSC2.20816",
                cited_by: { value: 5 }
            },
            {
                title: "Application of fuzzy logic for adaptability and stability studies in flood-irrigated rice (Oryza sativa)",
                doi: "10.1111/PBR.12973",
                doiLink: "https://doi.org/10.1111/PBR.12973",
                year: "2021",
                journalTitle: "PLANT BREEDING",
                link: "https://doi.org/10.1111/PBR.12973",
                cited_by: { value: 5 }
            },
            {
                title: "Performance of a breeding program for irrigated rice in Southeast Brazil",
                doi: "10.4238/GMR18332",
                doiLink: "https://doi.org/10.4238/GMR18332",
                year: "2019",
                journalTitle: "GENETICS AND MOLECULAR RESEARCH",
                link: "https://doi.org/10.4238/GMR18332",
                cited_by: { value: 4 }
            },
            {
                title: "Potential of dry matter yield from alfalfa germplasm in composing base populations",
                doi: "10.1590/1984-70332021V21N3A41",
                doiLink: "https://doi.org/10.1590/1984-70332021V21N3A41",
                year: "2021",
                journalTitle: "CROP BREEDING AND APPLIED BIOTECHNOLOGY",
                link: "https://doi.org/10.1590/1984-70332021V21N3A41",
                cited_by: { value: 3 }
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
                title: "Quarter century genetic progress in irrigated rice (Oryza sativa) in Southeast Brazil",
                doi: "10.1111/PBR.12972",
                doiLink: "https://doi.org/10.1111/PBR.12972",
                year: "2021",
                journalTitle: "PLANT BREEDING",
                link: "https://doi.org/10.1111/PBR.12972",
                cited_by: { value: 2 }
            },
            {
                title: "Prediction and importance of predictors in approaches based on computational intelligence and machine learning",
                doi: null,
                doiLink: null,
                year: "2023",
                journalTitle: "Agronomy Science and Biotechnology",
                link: null,
                cited_by: { value: 1 }
            },
            {
                title: "Multivariate Adaptive Regression Splines Enhance Genomic Prediction of Non-Additive Traits",
                doi: "10.3390/agronomy14102234",
                doiLink: "https://doi.org/10.3390/agronomy14102234",
                year: "2024",
                journalTitle: "Agronomy",
                link: "https://doi.org/10.3390/agronomy14102234",
                cited_by: { value: 1 }
            },
            {
                title: "Rapid detection of bromatological and chemical biomarkers of clones tolerant to eucalyptus physiological disorder",
                doi: "10.1016/J.SAJB.2024.10.052",
                doiLink: "https://doi.org/10.1016/J.SAJB.2024.10.052",
                year: "2024",
                journalTitle: "SOUTH AFRICAN JOURNAL OF BOTANY",
                link: "https://doi.org/10.1016/J.SAJB.2024.10.052",
                cited_by: { value: 1 }
            },
            {
                title: "Multi-information analysis for recommendation of flooded-irrigated rice for adaptability and phenotypic stability",
                doi: "10.33158/ASB.r145.v8.2022",
                doiLink: "https://doi.org/10.33158/ASB.r145.v8.2022",
                year: "2022",
                journalTitle: "Agronomy Science and Biotechnology",
                link: "https://doi.org/10.33158/ASB.r145.v8.2022",
                cited_by: { value: 1 }
            },
            {
                title: "Eficiência de técnicas de machine learning e de redes neurais na predição genômica e identificação de marcadores",
                doi: null,
                doiLink: null,
                year: "2022",
                journalTitle: "",
                link: null,
                cited_by: { value: 1 }
            },
            {
                title: "Dynamics, diversity and experimental precision in final irrigated rice testing: a time meta-analysis",
                doi: "10.1590/1984-70332020V20N4A55",
                doiLink: "https://doi.org/10.1590/1984-70332020V20N4A55",
                year: "2020",
                journalTitle: "CROP BREEDING AND APPLIED BIOTECHNOLOGY",
                link: "https://doi.org/10.1590/1984-70332020V20N4A55",
                cited_by: { value: 1 }
            },
            {
                title: "Comparison of supervised machine learning and variable selection methods for body weight prediction of growth pigs using image processing data",
                doi: "10.37496/rbz5320240001",
                doiLink: "https://doi.org/10.37496/rbz5320240001",
                year: "2024",
                journalTitle: "Revista Brasileira de Zootecnia",
                link: "https://doi.org/10.37496/rbz5320240001",
                cited_by: { value: 0 }
            },
            {
                title: "Bayesian inference applied to soybean grown under different shading levels using the multiple-trait model",
                doi: "10.1590/1678-992X-2022-0233",
                doiLink: "https://doi.org/10.1590/1678-992X-2022-0233",
                year: "2024",
                journalTitle: "SCIENTIA AGRICOLA",
                link: "https://doi.org/10.1590/1678-992X-2022-0233",
                cited_by: { value: 0 }
            },
            {
                title: "Trait prediction through computational intelligence and machine learning applied to soybean (Glycine max) breeding in shaded environments",
                doi: "10.1101/2024.01.31.578252",
                doiLink: "https://doi.org/10.1101/2024.01.31.578252",
                year: "2024",
                journalTitle: "bioRxiv",
                link: "https://doi.org/10.1101/2024.01.31.578252",
                cited_by: { value: 0 }
            },
            {
                title: "Ensaio comparativo preliminar de arroz irrigado em Minas Gerais safra 2018/2019",
                doi: null,
                doiLink: null,
                year: "2019",
                journalTitle: "",
                link: null,
                cited_by: { value: 0 }
            },
            {
                title: "BRSMG Rubelita: cultivar de arroz para cultivo em várzeas mineiras",
                doi: null,
                doiLink: null,
                year: "2017",
                journalTitle: "",
                link: null,
                cited_by: { value: 0 }
            }
        ]
    }
};

