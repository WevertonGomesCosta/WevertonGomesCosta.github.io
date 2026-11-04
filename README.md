# WevertonGomesCosta.github.io

Repositório do site acadêmico e portfólio de **Weverton Gomes da Costa**, publicado com GitHub Pages.

**Site:** https://wevertongomescosta.github.io/

## Estrutura do projeto

O repositório separa conteúdo publicado, dados canônicos, fontes externas e infraestrutura de manutenção.

### Site publicado

- `index.html` — página inicial.
- `publicacoes.html` — publicações e métricas bibliométricas.
- `projetos.html` — projetos.
- `politica-de-privacidade.html` — política de privacidade.
- `404.html` — página de erro.
- `style.css`, `utils.js` e `profile-interpolation.js` — apresentação e comportamento do frontend.
- `_site_components/` — componentes HTML compartilhados usados pelo renderer.

### Dados canônicos e gerados

- `profile.json` — fonte canônica dos dados pessoais e institucionais reutilizados pelo site.
- `academic-registry.json` — catálogo canônico da produção acadêmica.
- `bibliographic-source-links.json` — vínculos entre registros canônicos e fontes bibliográficas.
- `bibliometric-metrics.json` — métricas bibliométricas normalizadas.
- `fallback-data.json` — snapshot consolidado das fontes externas.
- `translations.json` — conteúdo textual PT/EN.

Evite duplicar informações pessoais ou acadêmicas em arquivos auxiliares. Atualizações estruturadas devem ocorrer nas fontes canônicas e ser propagadas pelo pipeline.

### Fontes externas

Arquivos brutos usados pelo pipeline ficam em `data/sources/`.

Atualmente:

- `data/sources/web-of-science/savedrecs.txt` — export local do Web of Science.

Credenciais e chaves ficam apenas em `keys.json`, que é ignorado pelo Git e nunca deve ser versionado.

### Scripts e testes

- `update_fallback.py` — coleta e reconcilia fontes acadêmicas e de desenvolvimento.
- `scripts/` — geração de métricas, reconciliação de publicações, renderer compartilhado e auditoria.
- `tests/` — testes unitários e contratos estruturais.
- `.audit/` — política e baseline da auditoria do repositório.
- `.github/workflows/` — validação automática em pull requests e em `main`.

### Documentação de engenharia

Decisões arquiteturais, planos e especificações históricas ficam em:

`docs/engineering/`

Esses documentos são fontes internas de engenharia e são excluídos do build do GitHub Pages.

## Ambiente local

O repositório também pode ser aberto como projeto do RStudio por meio de:

`WevertonGomesCosta.github.io.Rproj`

O estado local do RStudio (`.Rproj.user/`) não é versionado.

Para o ambiente Python:

```bash
python -m venv .venv
source .venv/Scripts/activate
python -m pip install -r requirements.txt
```

No Windows fora do Git Bash, ative o ambiente virtual pelo mecanismo apropriado ao terminal utilizado.

## Atualização dos dados

Com `keys.json` configurado localmente:

```bash
python update_fallback.py
```

O pipeline preserva a identidade canônica das publicações, reconcilia novas publicações verificadas e atualiza os artefatos acadêmicos de forma transacional.

## Validação

Antes de integrar alterações relevantes:

```bash
node --check profile-interpolation.js
node --check utils.js
node tests/test_profile_interpolation.js

python scripts/build_bibliometric_metrics.py --check
python -m unittest discover -s tests -p "test_*.py"
python -B scripts/render_shared_site.py --check
python scripts/audit_repository.py
```

O mesmo conjunto de controles é executado pelo workflow `Repository audit` no GitHub.

## Regras de manutenção

- Não versionar `keys.json`, `.venv/`, `.Rproj.user/`, caches ou arquivos temporários.
- Não editar manualmente artefatos gerados quando existir script responsável por sua geração.
- Manter dados pessoais e institucionais centralizados em `profile.json`.
- Manter produção acadêmica canônica em `academic-registry.json`.
- Preservar os testes e a auditoria ao alterar arquitetura, dados ou frontend.
- Preferir mudanças pequenas e verificáveis, integradas por pull request.
