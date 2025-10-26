# NCM Checker (GitHub Pages) — Base local com upload

Este repositório contém um site estático para verificar códigos NCM usando apenas um arquivo JSON local chamado `ncm.json`.

## Funcionalidades
- Extrai NCMs de texto colado e lista se são vigentes, com descrição e datas.
- Exibe no topo: **Base NCM vigente em: DD/MM/AAAA** (texto definido pelo usuário).
- Permite que o usuário **faça upload** de um novo arquivo JSON (estrutura oficial) e o armazene no *LocalStorage* do navegador.
- Oferece opção para baixar o `ncm.json` gerado, pronto para ser enviado ao repositório GitHub.

## Como usar
1. Faça deploy no GitHub Pages (host estático).
2. O repositório já contém um `ncm.json` inicial (arquivo fornecido).
3. No site, clique em "Atualizar Tabela NCM" para selecionar um novo JSON. Se válido, ele ficará disponível localmente e você poderá baixar o `ncm.json` e subir no repositório (substituindo o existente).
