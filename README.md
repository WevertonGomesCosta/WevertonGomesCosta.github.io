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

### Atualização automática no GitHub Actions

O workflow `.github/workflows/update-academic-data.yml` executa o pipeline
semanalmente às quartas-feiras, às 06h17 (horário de Brasília), e também pode
ser iniciado manualmente em **Actions → Update academic data → Run workflow**.
Ele só executa na branch `main` e valida os arquivos antes de publicar.
Para respeitar o ruleset da `main`, o commit é enviado primeiro a uma
branch temporária `automation/academic-refresh/<run-id>`. O workflow de
auditoria executa nessa branch; somente depois do status obrigatório
`audit` ser aprovado **para o mesmo commit**, o workflow envia esse
commit à `main` sem force push. Após a tentativa, remove a branch
temporária. Se a auditoria falhar ou a `main` avançar, a publicação
não ocorre e a execução falha sem alterar os dados publicados.

Configure os seguintes **Repository secrets** em
**Settings → Secrets and variables → Actions**:

- `SERPAPI_API_KEY`: chave principal da SerpApi (obrigatória).
- `SERPAPI_API_KEY2`: segunda chave SerpApi para contingência (opcional).
- `SCOPUS_API_KEY`: chave da API Elsevier/Scopus (obrigatória).
- `ACADEMIC_UPDATE_PUSH_TOKEN`: fine-grained personal access token com
  acesso **somente a este repositório**, permissão **Contents: Read and write**
  e prazo de validade acompanhado pelo proprietário. É necessário para que
  o push dos JSONs dispare tanto a auditoria quanto a publicação do GitHub Pages.
  Não use `GITHUB_TOKEN` para esse push: ele não aciona o build do Pages
  configurado para publicação por branch.

Os identificadores públicos de perfil são lidos diretamente de `profile.json`.
O workflow gera `keys.json` temporariamente com permissões restritas e o apaga
ao terminar a coleta. Não compartilhe nem registre valores de secrets no código.

A execução atualiza, quando necessário, apenas `fallback-data.json`,
`bibliometric-metrics.json`, `academic-registry.json` e
`bibliographic-source-links.json`. Falhas nos testes/auditoria bloqueiam o
commit. Um push rejeitado (por conflito ou proteção da branch) também provoca
falha, sem reescrever a história do repositório.

O Web of Science usa o export **versionado**
`data/sources/web-of-science/savedrecs.txt`; suas citações só mudam após
substituição manual por um novo export e uma execução do pipeline. No Scopus,
a consulta de publicações pode funcionar mesmo quando o histórico de citações
está indisponível; nesse caso o histórico anterior é preservado.

Após configurar os secrets, faça uma execução manual e confirme o sucesso do
workflow, da auditoria e da atualização do site. Caso o Pages esteja configurado
para outro modo de publicação, confira **Settings → Pages** antes de ativar
o agendamento.

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
