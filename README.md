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
# Apenas atualizar os dados no computador (sem criar PR):
python update_fallback.py

# Atualizar os dados, criar PR e fazer merge após aprovação do check audit:
python update_fallback.py --publish
```

Ambos os modos exibem um comparativo **anterior → atual** para GitHub,
Google Scholar, Scopus, Web of Science e ORCID. O relatório mostra contagem
de publicações/registros, citações e índices h/i10 (quando disponíveis),
inclusive métricas desde 2021. `n/d` indica valor ausente, e `stale`
indica que uma coleta falhou e o último dado válido foi preservado.

Para atualizar o Web of Science, substitua
`data/sources/web-of-science/savedrecs.txt` pelo novo export antes da
execução. **`--publish` inclui esse arquivo no mesmo PR dos quatro JSONs**,
de modo que a atualização do WoS não seja perdida na próxima coleta agendada.

**Política de publicação:** a coleta e o relatório comparativo sempre são
executados, mas `--publish` só abre PR quando houver alteração relevante
no conteúdo público (citações, publicações, indicadores, status de fonte,
vínculos canônicos, atividade GitHub que não seja apenas `updated_at`)
ou quando o export versionado do WoS tiver sido alterado. Horários de
execução (`lastUpdated`, `last_valid_at`) e `updated_at` dos
repositórios GitHub, isoladamente, **não geram PR**. Na ausência de mudança,
o programa preserva os JSONs atuais e informa que o PR é desnecessário.

**Exceção contratual Scopus:** os indicadores exibidos precisam de validação
publicada pelo menos semanalmente. A execução do agendamento semanal publica
a renovação de `last_valid_at` se a consulta Scopus foi bem-sucedida,
mesmo que as métricas estejam iguais. Uma execução manual recente renova
essa data somente após seis dias, impedindo PRs repetitivos e evitando
que os indicadores desapareçam por expiração do cache público.

O modo `--publish` depende de Git e da [GitHub CLI](https://cli.github.com/)
instalados e autenticados (`gh auth login`), além de uma `main` local
sincronizada com `origin/main`. Execute na raiz do repositório e na branch
`main`. Por segurança, o modo recusará alterações de outros arquivos,
não fará `force push` e não realizará merge se a auditoria do PR falhar.
O PR permanecerá disponível para inspeção caso ocorra falha. A espera
pela auditoria repete consultas temporariamente indisponíveis sem aceitar
resultados não aprovados; falhas explícitas de auditoria impedem o merge.
**O modo padrão não publica nem cria PR**, inclusive quando chamado pelo
GitHub Actions.

O pipeline preserva a identidade canônica das publicações, reconcilia novas
publicações verificadas e atualiza os artefatos acadêmicos de forma transacional.

### Atualização automática no GitHub Actions

O workflow `.github/workflows/update-academic-data.yml` executa o pipeline
semanalmente às quartas-feiras, às 06h17 (horário de Brasília), e também pode
ser iniciado manualmente em **Actions → Update academic data → Run workflow**.
Ele só executa na branch `main` e valida os arquivos antes de publicar.
Para respeitar o ruleset da `main`, o commit é enviado primeiro a uma
branch temporária `automation/academic-refresh/<run-id>`. O workflow de
auditoria executa nessa branch; somente depois do status obrigatório
`audit` ser aprovado **para o mesmo commit**, o workflow envia esse
commit à `main` sem force push. A consulta do check possui tentativas
adicionais contra falhas transitórias do GitHub; a branch temporária
só é removida após publicação bem-sucedida. Se a auditoria falhar ou a
`main` avançar, a publicação não ocorre, a branch é preservada para
recuperação e a execução falha sem alterar os dados publicados.

Configure os seguintes **Repository secrets** em
**Settings → Secrets and variables → Actions**:

- `SERPAPI_API_KEY`: chave principal da SerpApi (obrigatória).
- `SERPAPI_API_KEY2`: segunda chave SerpApi para contingência (opcional).
- `SCOPUS_API_KEY`: chave da API Elsevier/Scopus (obrigatória).
- `SCOPUS_INSTTOKEN`: token institucional aprovado pela Elsevier (obrigatório
  para a execução agendada); enviado apenas em `X-ELS-Insttoken` nas
  requisições HTTPS. Mantenha exclusivamente em Repository secrets.
- `ACADEMIC_UPDATE_PUSH_TOKEN`: fine-grained personal access token com
  acesso **somente a este repositório**, permissão **Contents: Read and write**
  e prazo de validade acompanhado pelo proprietário. É necessário para que
  o push dos JSONs dispare tanto a auditoria quanto a publicação do GitHub Pages.
  Não use `GITHUB_TOKEN` para esse push: ele não aciona o build do Pages
  configurado para publicação por branch.

Os identificadores públicos de perfil são lidos diretamente de `profile.json`.
No computador, para autenticar as consultas Scopus sem gravar o insttoken em
arquivos, configure a variável de ambiente `SCOPUS_INSTTOKEN` para a sessão
do terminal (Git Bash: `read -rs SCOPUS_INSTTOKEN; export SCOPUS_INSTTOKEN`).
Alternativamente, `scopus_insttoken` pode existir no `keys.json` local
ignorado pelo Git, mas prefira o ambiente por ser uma credencial institucional
de alto privilégio. Nunca use o token no código do site, URLs, logs ou commits.

**Distribuição pública Scopus:** conforme a autorização de exibição da série
anual agregada informada pelo titular, a busca detalhada continua restrita à
memória durante a reconciliação. `fallback-data.json` contém indicadores
agregados do autor e o histórico **anual agregado de publicações e citações
Scopus** (somente `year`, `publications` e `citations`), sem registros
individuais de artigos. `bibliometric-metrics.json` mantém vínculos de IDs,
sem contagens de citações Scopus por artigo. Os indicadores continuam ligados
ao perfil Scopus e o pipeline permanece semanal.

A série anual só é substituída quando **todos os lotes** do Citation Overview
forem recebidos com sucesso. Quando a coleta histórica falha, a última série
completa permanece publicada com `history_status=stale`, sem preencher anos
desconhecidos com zeros. O estado da coleta do autor é independente do estado
da série anual; os valores podem ter datas de validação distintas. Essa
publicação pressupõe que a autorização Elsevier informada abrange divulgação
pública e atualização da série anual agregada; revisar o alcance caso as
condições da autorização institucional mudem.
**Atenção:** o histórico antigo do Git ainda contém versões anteriores dos
JSONs; a limpeza desse histórico exige avaliação separada e não é realizada
automaticamente, pois afetaria toda a história e regras da branch.
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
