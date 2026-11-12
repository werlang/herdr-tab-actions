# herdr-tab-actions

Fonte da verdade dos mods de **tabs, panes e terminal references** do Herdr:

- `mods/tabs-ref` — clone da barra de abas que abre o `ref-menu` no right-click, mostra o ícone de pin, mantém abas pinadas à frente do bloco regular de abas, esconde a aba placeholder New tab (`space-pin`) se houver abas normais (a menos que esteja selecionada), põe o botão `+` ao fim da barra (depois da última aba visível), mostra um botão **Docker** à esquerda de **Files** quando o layout monta um bloco `docker` no `panel-body` (com o mesmo toggle por space de Files/Changes) e atende `tabs-ref.closeTab`, `tabs-ref.newTab` e `tabs-ref.select1`..`select9`.
- `mods/ref-menu` — clone do menu de contexto de pane e aba com **Pin tab / Unpin tab** e **Copy reference** (copia o endereço `hc` do terminal + contexto para a área de transferência via `ref.js`). Com `new-pane` instalado, os itens **Split right** / **Split down** abrem o chooser no pane novo; sem ele, continuam abrindo um terminal direto.
- `mods/pane-plus` — clone do header shipped `pane`: mostra programa, pasta e status e, no hover, botões de **Split right**, **Split down**, **Move**, **Zoom** e **Close**. Os splits abrem o `new-pane` quando instalado; sem ele, abrem um terminal direto. O botão Move abre um popup próprio (props `{ menu: pane }`) com Split right/down, Move left/right/up/down, Zoom e Close.
- `mods/new-pane` — o chooser **New pane** (mesmo visual do New tab do `space-pin`): Terminal (`T`/Enter) e agents instalados (`1`–`9`). Ao escolher, abre o terminal/agent no split e fecha o pane do chooser, então a escolha ocupa o lugar do split.
- `mods/toast` — substituto do mod shipped `toast`: clicar em qualquer notificação abre um diálogo modal centralizado mostrando o título completo, mensagem inteira com quebras de linha preservadas e rolagem, botão para copiar mensagem para a área de transferência (`cx.write_to_clipboard`), botão para rodar a ação original (se houver) e botão Fechar/Esc. A lógica de formatação fica em `toast-logic.js` e é testada em Node puro.

## Header de pane

O `pane-plus` é montado no header do pane frame:

```json
"pane": {
  "lone": true,
  "header": {
    "content": { "mod": "pane-plus" },
    "height": 30,
    "position": "top",
    "reveal": "hover"
  }
}
```

`lone: true` é obrigatório: sem ele, o pane único de uma tab (onde o primeiro split começa) não tem frame e o header não aparece. `reveal: "hover"` mostra o header só com o ponteiro no pane; `"always"` deixa fixo.

Os botões:

- **Split right** / **Split down** → `pane.split` com o `pane` daquela cópia.
- **Move** → popup com `pane.swap` nas quatro direções.
- **Zoom** → `pane.zoom`; **Close** → `pane.close`.
- O botão Move só aparece quando `panes()[i].movable` é true (não em pane único ou zoomado).

Quando um `terminal.open` cria o pane, o header pode receber por um frame o `props().pane` anterior junto com o `props().terminal` novo. Os dois ids são válidos, então `me()` não pode confiar no pane primeiro: `resolveHeaderPane` em `pane.js` usa o terminal exato quando ele resolve (mesmo que o pane antigo esteja em outro espaço), preserva mod panes sem terminal e cai no pane id apenas quando o terminal não resolve. É esse pane resolvido que alimenta split, zoom, close e foco.

Com `new-pane` instalado, o split vira `pane.split { direction, pane, mod: "new-pane", props: { space, direction, folder } }`. Sem ele, `pane.split { direction, pane }` abre um terminal.

Comandos opcionais para teclado: `pane-plus.splitRight`, `pane-plus.splitDown` e `pane-plus.menu`. Cada cópia do header recebe o comando; só age a cópia cujo `props().pane` é o pane focado. Como comando de mod só resolve com o mod montado, mantenha `pane.split:right`/`:down` nos layouts sem `pane-plus`.

## New pane

`new-pane` é um mod pane criado por `pane.split`, não uma tab: ele não tem slot no layout. Props: `{ space, direction, folder }`.

- Lista Terminal e agents instalados (ordem alfabética, `knownAgents`, cache `shared("new-menu.agents")`).
- `T`/Enter abre terminal; `1`–`9` abre o agent correspondente.
- Ao escolher: `pane.focus` no próprio chooser, `terminal.open { place: direction, folder, argv?, name? }` e `pane.close` no pane do chooser. O terminal/agent fica no lugar do split.
- `focusable: true`: `pane.go` pode entrar na cópia e manda `focus` via `nextCommand()`. Uma janela curta de 500 ms tenta pegar o teclado quando o split acabou de ser criado; cópias escondidas e dois choosers na mesma tab não brigam pelo foco (ver `ownPane` em `chooser.js`).
- O chooser é a cópia do visual do `space-pin`; o título é **New pane**. O `folder` vem do pane dividido (`p.pane.cwd` via `pane-plus`, ou `place(space)` no `ref-menu`), com fallback para o local do space (inclusive o local fixado do pin).

## Abas pinadas

O estado das abas fica em `shared("tabs.pinned")` (ids de aba). O right-click numa aba mostra **Pin tab / Unpin tab**; a aba pinada ganha o ícone de pin e vai para o começo das abas regulares. O `tabs-ref` reordena o modelo via `tab.move` (pinned, depois não pinadas, depois eventuais placeholders), então `cmd+1..9`, `tab.next` e arrastar continuam coerentes. A lista sobrevive fechar/abrir o Herdr; ids de abas fechadas ficam nela sem efeito, porque ids de aba não são reaproveitados.

O `cmd+1..9` deve ser ligado a `tabs-ref.select1`..`tabs-ref.select9` (um comando de mod não recebe argumentos, por isso há um por número):

```json
"cmd-1": "tabs-ref.select1",
"cmd-9": "tabs-ref.select9"
```

O `tabs-ref` conta só as abas que a barra mostra (`visibleTabs`): a aba placeholder `space-pin` escondida nunca é alcançada, e um número maior que a quantidade de abas visíveis é ignorado, sem erro (o `tab.select:N` embutido dá erro e conta abas escondidas). Sem o `tabs-ref` montado, mantenha `tab.select:N`.

O `cmd+w` deve ser ligado a `tabs-ref.closeTab`:

```json
"cmd-w": "tabs-ref.closeTab"
```

Numa aba pinada ele não fecha: seleciona a aba mais próxima (empate vai para a direita). Numa aba normal ele chama `tab.close` como antes. O X da aba e o **Close** do menu ainda fecham explicitamente, inclusive uma aba pinada. `<mod>.<command>` precisa do mod montado no layout; sem o `tabs-ref`, mantenha `cmd-w` em `tab.close`.

O `cmd+t` deve ser ligado a `tabs-ref.newTab` quando o `tabs-ref` está montado:

```json
"cmd-t": "tabs-ref.newTab"
```

Ele abre ou seleciona a aba placeholder **New tab** (`space-pin`) do space ativo, em vez de criar um terminal direto. Sem o `tabs-ref`, use `spaces-plus.newTerminal` (ou `tab.new`) — ver o repo `herdr-space-actions`.

## Reordenar panes

- O header tem **Move** → `pane.swap` left/right/up/down.
- O app já reordena arrastando pelo grip do topo do pane; `cmd-alt-shift-arrows` já estão ligados a `pane.swap` no `keys.json` do usuário.
- `pane.swap` troca com o vizinho na direção; sem vizinho, não faz nada.

## Copy reference

O right-click num terminal pane ou numa aba oferece **Copy reference · <app>**:

1. Coloca na área de transferência uma linha estruturada começando pelo endereço `hc` (`t9` ou `machine/t9`) seguido do contexto (programa, título, aba, space, diretório).
2. Outros agentes ou scripts podem interagir com o terminal imediatamente via `hc get/read/send/wait <address>`.
3. Compatível com macOS (`osascript`), Linux (`wl-copy` ou `xclip`) e Windows (PowerShell).

## Regra: sempre atualizar a pasta live do Herdr

O Herdr lê os mods de `~/.config/herdr-app/mods/<nome>`. Depois de **qualquer** mudança aqui:

```sh
./sync.sh
```

O script copia `tabs-ref`, `ref-menu`, `pane-plus` e `new-pane` para a pasta live e roda `herdr-app check` neles. Não edite a pasta live diretamente.

## Ligação no layout

O layout aponta o bloco `tabs` para `tabs-ref`, o root `terminal_menu` para `ref-menu` e o header do pane frame para `pane-plus`:

```json
{
  "id": "tabs",
  "type": "block",
  "content": { "mod": "tabs-ref" }
}
```

```json
"terminal_menu": "ref-menu"
```

```json
"pane": {
  "lone": true,
  "header": {
    "content": { "mod": "pane-plus" },
    "height": 30,
    "position": "top",
    "reveal": "hover"
  }
}
```

`new-pane` não entra no layout: ele é criado por `pane.split` dentro de uma tab. Os `tabs` e `menu` originais do Herdr continuam intocados. Se o layout for resetado, reponha os quatro slots.

## Integrações opcionais

Nenhum mod deste repo depende de outro mod (nem deste repo nem de outros): cada um é instalável sozinho. `tabs-ref`, `pane-plus` e `ref-menu` procuram os mods opcionais na pasta live (`mods/<nome>/mod.json`); `tabs-ref` re-checa a cada 5 s, `pane-plus` a cada 15 s e `ref-menu` a cada abertura do menu, então instalar ou desativar um deles vale na hora. Ícones ficam sempre na pasta do próprio mod ou em um mod shipped do Herdr (`pane`, `workspace-chrome`, `files`, `changes`); nunca use assets de outro mod custom.

- `ref-menu` (deste repo): quando instalado, é o menu do clique direito numa aba. Sem ele, abre o `menu` do Herdr (sem Copy reference nem Pin tab). Do outro lado, o `ref-menu` só mostra **Pin tab** enquanto `tabs-ref` estiver montado no layout, e só cria o placeholder ao fechar a última aba se `space-pin` estiver instalado.
- `new-pane` (deste repo): quando instalado, os splits de `pane-plus` e `ref-menu` abrem o chooser; sem ele, abrem um terminal direto.
- `new-menu-plus` (do repositório `herdr-space-actions`): quando instalado, o botão `+` abre o overlay de criação rápida de abas. Sem ele, o botão `+` executa diretamente a ação padrão `tab.new` no space ativo. O atalho antigo `cmd+opt+t` (`tabs-ref.newMenu`) foi removido: o `cmd+t` já abre a aba New tab.
- `agent-chat` (do repositório `herdr-agent-chat`): quando instalado, exibe o toggle Original / Chat na barra de abas para alternar ou criar o split de chat. Sem ele, a barra de alternância de chat não é renderizada. Os ícones do toggle são cópias locais (`mods/tabs-ref/terminal.svg`, `chat.svg`).
- `space-pin` (do repositório `herdr-space-actions`): é a aba placeholder **New tab** que o `tabs-ref` esconde, restaura e seleciona. O ícone usado na barra é uma cópia local em `mods/tabs-ref/new-tab.svg`, para o repo continuar publicável sozinho. Sem `space-pin`, a barra de abas funciona, mas não há placeholder de space pinado: `cmd+t` abre uma aba de terminal e fechar a última aba fecha o space, como no Herdr.
- `file-editor` (do repositório `herdr-file-editor`): quando instalado, publica `preview: true` em `shared("file-editor.openTabs")` para abas abertas com um clique. O `tabs-ref` desenha o nome em itálico e apagado, com um ponto vazado, promove a aba a permanente no duplo clique (em vez de abrir o rename) e promove também ao pinar. Sem o `file-editor`, não há abas de preview e o duplo clique continua renomeando.

## Preview de arquivos

Abas de preview (temporárias) vêm do `file-editor` e são identificadas por `entry.preview === true` no mapa `shared("file-editor.openTabs")`. O `tabs-ref` casa primeiro por `tabId` e, enquanto a aba recém-criada ainda não registrou o id, pelo `tabName` exato; nos dois casos a aba precisa hospedar um pane `file-editor` agora, para não sobrar itálico ou promoção quando o editor é desinstalado ou o pane é fechado. Abrir outro arquivo em preview substitui a aba temporária anterior; editar a aba ou piná-la a torna permanente (o pin vindo do `ref-menu` chega via `tabs-ref.reorder`, que promove previews pinadas antes de ordenar). O duplo clique numa aba permanente mantém o comportamento antigo de renomear.

## Testes

Para rodar os testes unitários de `ref.js`, `preview.js`, `pane.js` e `chooser.js` (sem necessidade de `npm test`):

```sh
node --test test/
```

## Skill

A skill `herdr-publish` está em `.agents/skills/herdr-publish/SKILL.md`. Ela cobre validação, sync, `RECIPE.md`/`preview.png` e publicação em `herdr.dev/mods` com o tópico `herdr-mod`.
