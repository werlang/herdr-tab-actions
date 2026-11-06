# herdr-tab-actions

Fonte da verdade dos mods de **tabs** e **terminal references** do Herdr:

- `mods/tabs-ref` — clone da barra de abas que abre o `ref-menu` no right-click, mostra o ícone de pin, mantém abas pinadas à frente do bloco regular de abas, esconde a aba placeholder New tab (`space-pin`) se houver abas normais (a menos que esteja selecionada), põe o botão `+` ao fim da barra (depois da última aba visível) e atende `tabs-ref.closeTab`, `tabs-ref.newTab` e `tabs-ref.select1`..`select9`.
- `mods/ref-menu` — clone do menu de contexto de pane e aba com **Pin tab / Unpin tab** e **Copy reference** (copia o endereço `hc` do terminal + contexto para a área de transferência via `ref.js`).

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

O script copia `tabs-ref` e `ref-menu` para a pasta live e roda `herdr-app check` neles. Não edite a pasta live diretamente.

## Ligação no layout

O layout aponta o bloco `tabs` para `tabs-ref` e o root `terminal_menu` para `ref-menu`:

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

Os `tabs` e `menu` originais do Herdr continuam intocados. Se o layout for resetado, reponha `tabs-ref` e `ref-menu`.

## Integrações opcionais

O mod `tabs-ref` detecta em tempo de inicialização a presença de outros mods opcionais:

- `new-menu-plus` (do repositório `herdr-space-actions`): quando instalado, o botão `+` abre o overlay de criação rápida de abas. Sem ele, o botão `+` executa diretamente a ação padrão `tab.new` no space ativo. O atalho antigo `cmd+opt+t` (`tabs-ref.newMenu`) foi removido: o `cmd+t` já abre a aba New tab.
- `agent-chat` (do repositório `herdr-agent-chat`): quando instalado, exibe o toggle Original / Chat na barra de abas para alternar ou criar o split de chat. Sem ele, a barra de alternância de chat não é renderizada.
- `space-pin` (do repositório `herdr-space-actions`): é a aba placeholder **New tab** que o `tabs-ref` esconde, restaura e seleciona. O ícone usado na barra é uma cópia local em `mods/tabs-ref/new-tab.svg`, para o repo continuar publicável sozinho. Sem `space-pin`, a barra de abas funciona, mas não há placeholder de space pinado.

## Testes

Para rodar os testes unitários de `ref.js` (sem necessidade de `npm test`):

```sh
node --test test/
```

## Skill

A skill `herdr-publish` está em `.agents/skills/herdr-publish/SKILL.md`. Ela cobre validação, sync, `RECIPE.md`/`preview.png` e publicação em `herdr.dev/mods` com o tópico `herdr-mod`.
