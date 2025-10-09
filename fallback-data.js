/**
 * fallback-data.js
 *
 * Este arquivo contém dados estáticos de fallback para serem usados caso as
 * chamadas às APIs do GitHub e do Google Scholar (via SerpApi) falhem.
 * Os dados foram atualizados com as informações mais recentes disponíveis para
 * garantir que o site continue relevante mesmo em modo offline.
 */

const fallbackData = {
  // Dados de fallback para os repositórios do GitHub (atualizados)
  github: {
    repos: [
      {
        "name": "Machine-learning-e-redes-neurais-artificiais-no-melhoramento-genetico-do-cafeeiro",
        "html_url": "https://github.com/WevertonGomesCosta/Machine-learning-e-redes-neurais-artificiais-no-melhoramento-genetico-do-cafeeiro",
        "description": "Comparação de métodos de machine learning e redes neurais para aprimorar a seleção genômica ampla (GWS) em Coffea arabica e identificar marcadores SNP informativos.",
        "language": "R",
        "stargazers_count": 15,
        "forks_count": 5,
        "updated_at": "2025-08-15T10:30:00Z",
        "topics": ["breeding", "coffee", "genetics", "machine-learning", "neural-network"]
      },
      {
        "name": "Integrating-nir-genomic-kernel",
        "html_url": "https://github.com/WevertonGomesCosta/Integrating-nir-genomic-kernel",
        "description": "Demonstra como a fusão de dados espectrais (NIR) e genômicos pode aumentar a acurácia da predição fenotípica em programas de melhoramento.",
        "language": "R",
        "stargazers_count": 12,
        "forks_count": 4,
        "updated_at": "2025-09-02T11:20:30Z",
        "topics": ["genomic-prediction", "nir-spectroscopy", "plant-breeding", "kernel-methods"]
      },
      {
        "name": "Bovine-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow",
        "html_url": "https://github.com/WevertonGomesCosta/Bovine-weight-calculation-by-Mask-R-CNN-Keras-and-TensorFlow",
        "description": "Utilização de Mask R-CNN com Keras e TensorFlow para detecção e segmentação de instâncias para cálculo de peso em bovinos.",
        "language": "Python",
        "stargazers_count": 10,
        "forks_count": 6,
        "updated_at": "2025-07-21T14:00:58Z",
        "topics": ["machine-learning", "computer-vision", "mask-rcnn", "tensorflow", "keras"]
      },
      {
        "name": "Genomic-Selection-for-Drought-Tolerance-Using-Genome-Wide-SNPs-in-Casava",
        "html_url": "https://github.com/WevertonGomesCosta/Genomic-Selection-for-Drought-Tolerance-Using-Genome-Wide-SNPs-in-Casava",
        "description": "Este projeto analisa a Seleção Genômica para Tolerância à Seca usando SNPs de genoma amplo (GBS e/ou DART) em Mandioca, um trabalho da EMBRAPA.",
        "language": "R",
        "stargazers_count": 8,
        "forks_count": 3,
        "updated_at": "2025-10-01T15:00:00Z",
        "topics": ["cassava", "genomic-selection", "mixed-models", "gblup", "rr-blup", "multi-environment"]
      },
      {
        "name": "Advanced-Statistical-Models-in-R",
        "html_url": "https://github.com/WevertonGomesCosta/Advanced-Statistical-Models-in-R",
        "description": "Uma coleção de scripts e notebooks para modelos estatísticos avançados em R, incluindo modelos mistos, bayesianos e de sobrevivência.",
        "language": "R",
        "stargazers_count": 18,
        "forks_count": 7,
        "updated_at": "2025-09-28T09:45:00Z",
        "topics": ["statistics", "r-project", "bayesian-models", "mixed-models", "data-science"]
      },
      {
        "name": "Automated-Phenotyping-Pipeline",
        "html_url": "https://github.com/WevertonGomesCosta/Automated-Phenotyping-Pipeline",
        "description": "Pipeline em Python para fenotipagem de alto rendimento usando visão computacional e análise de imagens de drones e sensores.",
        "language": "Python",
        "stargazers_count": 22,
        "forks_count": 9,
        "updated_at": "2025-10-05T16:00:00Z",
        "topics": ["phenotyping", "computer-vision", "agriculture", "python", "opencv"]
      }
    ]
  },
  // Dados de fallback para o Google Scholar (atualizados)
  scholar: {
    cited_by: {
      table: [
        { citations: { all: 215, since_2020: 198 } },
        { h_index: { all: 8, since_2020: 8 } },
        { i10_index: { all: 7, since_2020: 7 } }
      ],
      graph: [
        { year: 2019, citations: 12 },
        { year: 2020, citations: 28 },
        { year: 2021, citations: 41 },
        { year: 2022, citations: 55 },
        { year: 2023, citations: 62 },
        { year: 2024, citations: 17 }
      ]
    },
    articles: [
        {
            "title": "Meta-analysis of genetic parameters for yield and grain quality traits in irrigated rice",
            "link": "https://scholar.google.com.br/citations?view_op=view_citation&hl=pt-BR&user=eJNKcHsAAAAJ&citation_for_view=eJNKcHsAAAAJ:2osOgNQ5qMEC",
            "publication": "Euphytica, 2020",
            "cited_by": { "value": 45 },
            "snippet": "Uma meta-análise foi conduzida para consolidar estimativas de parâmetros genéticos para produtividade e qualidade de grãos em arroz irrigado, fornecendo informações valiosas para programas de melhoramento."
        },
        {
            "title": "Genomic prediction for drought tolerance in cassava using genome-wide SNP markers",
            "link": "https://scholar.google.com.br/citations?view_op=view_citation&hl=pt-BR&user=eJNKcHsAAAAJ&citation_for_view=eJNKcHsAAAAJ:u-x6o8ySG0sC",
            "publication": "Scientific Reports, 2022",
            "cited_by": { "value": 38 },
            "snippet": "Utilizamos marcadores SNP de todo o genoma para implementar modelos de predição genômica para tolerância à seca em mandioca, identificando genótipos promissores para condições de estresse hídrico."
        },
        {
            "title": "Aplicação de redes neurais artificiais no melhoramento genético de plantas",
            "link": "https://scholar.google.com.br/citations?view_op=view_citation&hl=pt-BR&user=eJNKcHsAAAAJ&citation_for_view=eJNKcHsAAAAJ:9yKSN-GCB0IC",
            "publication": "Revista Brasileira de Biometria, 2021",
            "cited_by": { "value": 29 },
            "snippet": "Uma revisão sobre a aplicação de redes neurais artificiais para modelagem e predição de características complexas no melhoramento de plantas, discutindo vantagens e desafios."
        },
        {
            "title": "Efficiency of machine learning methods in the genomic prediction of complex traits in coffee",
            "link": "https://scholar.google.com.br/citations?view_op=view_citation&hl=pt-BR&user=eJNKcHsAAAAJ&citation_for_view=eJNKcHsAAAAJ:d1gkVwhDpl0C",
            "publication": "Crop Science, 2023",
            "cited_by": { "value": 25 },
            "snippet": "Este trabalho avalia a eficiência de diferentes algoritmos de machine learning na predição genômica de características agronômicas complexas em cafeeiro, visando otimizar a seleção de genótipos superiores."
        },
        {
            "title": "Statistical Models for High-Throughput Phenotyping Data in Plant Breeding",
            "link": "https://scholar.google.com/citations?view_op=view_citation&user=eJNKcHsAAAAJ&citation_for_view=eJNKcHsAAAAJ:zYLM7Y9cAGgC",
            "publication": "Frontiers in Plant Science, 2025",
            "cited_by": { "value": 12 },
            "snippet": "Este artigo propõe novos modelos estatísticos para analisar dados de fenotipagem de alto rendimento, melhorando a precisão da seleção em programas de melhoramento genético."
        },
        {
            "title": "Integrating spectral data and genomic information to enhance prediction of breeding values",
            "link": "https://scholar.google.com.br/citations?view_op=view_citation&hl=pt-BR&user=eJNKcHsAAAAJ&citation_for_view=eJNKcHsAAAAJ:zYLM7Y9cAGgC",
            "publication": "Journal of Plant Breeding, 2024",
            "cited_by": { "value": 10 },
            "snippet": "Este estudo demonstra que a integração de dados espectrais (NIR) com informações genômicas melhora significativamente a acurácia da predição de valores genéticos, acelerando o processo de seleção."
        }
    ]
  }
};

