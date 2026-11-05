# herdr-tab-actions

Fonte da verdade dos mods de **tabs** e **terminal references** do Herdr:

- `mods/tabs-ref` — clone da barra de abas que abre o `ref-menu` no right-click, mostra o ícone de pin, mantém abas pinadas à frente do bloco regular de abas, esconde a aba placeholder New tab (`space-pin`) se houver abas normais (a menos que esteja selecionada) e atende `tabs-ref.closeTab` e `tabs-ref.newTab`.
- `mods/ref-menu` — clone do menu de contexto de pane e aba com **Pin tab / Unpin tab** e **Copy reference** (copia o endereço `hc` do terminal + contexto para a área de transferência via `ref.js`).

## Abas pinadas

O estado das abas fica em `shared("tabs.pinned")` (ids de aba). O right-click numa aba mostra **Pin tab / Unpin tab**; a aba pinada ganha o ícone de pin e vai para o começo das abas regulares. O `tabs-ref` reordena o modelo via `tab.move` (pinned, depois não pinadas, depois eventuais placeholders), então `cmd+1..9`, `tab.next` e arrastar continuam coerentes. A lista sobrevive fechar/abrir o Herdr; ids de abas fechadas ficam nela sem efeito, porque ids de aba não são reaproveitados.

O `cmd+w` deve ser ligado a `tabs-ref.closeTab`:

```json
"cmd-w": "tabs-ref.closeTab"
```

Numa aba pinada ele não fecha: seleciona a aba mais próxima (empate vai para a direita). Numa aba normal ele chama `tab.close` como antes. O X da aba e o **Close** do menu ainda fecham explicitamente, inclusive uma aba pinada. `<mod>.<command>` precisa do mod montado no layout; sem o `tabs-ref`, mantenha `cmd-w` em `tab.close`.

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

- `new-menu-plus` (do repositório `herdr-space-actions`): quando instalado, o botão `+` abre o overlay de criação rápida de abas e o comando `tabs-ref.newMenu` é habilitado. Sem ele, o botão `+` executa diretamente a ação padrão `tab.new` no space ativo.
- `agent-chat` (do repositório `herdr-agent-chat`): quando instalado, exibe o toggle Original / Chat na barra de abas para alternar ou criar o split de chat. Sem ele, a barra de alternância de chat não é renderizada.

## Testes

Para rodar os testes unitários de `ref.js` (sem necessidade de `npm test`):

```sh
node --test test/
```

## Skill

A skill `herdr-publish` está em `.agents/skills/herdr-publish/SKILL.md`. Ela cobre validação, sync, `RECIPE.md`/`preview.png` e publicação em `herdr.dev/mods` com o tópico `herdr-mod`.
