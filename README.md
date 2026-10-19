# Bot pessoal de figurinhas

Envie uma imagem na conversa com você mesmo ("Você") no WhatsApp e o bot devolve uma figurinha. Funciona enquanto o computador estiver ligado, conectado à internet e o programa aberto.

## Como iniciar no Windows

1. Instale o [Node.js LTS](https://nodejs.org/) versão 22.12 ou superior, se necessário.
2. Extraia o ZIP inteiro para uma pasta. Abra **iniciar.bat** com dois cliques. A primeira execução instala as dependências e baixa um navegador; pode levar alguns minutos.
3. Abra **http://127.0.0.1:8787** no computador para visualizar o QR atualizado. No celular, abra **WhatsApp → Aparelhos conectados → Conectar aparelho** e escaneie o QR. O código também aparece na janela do programa. Aguarde **Bot pronto!**.
4. Abra a conversa com você mesmo, identificada como **Você**, e envie uma foto. O bot devolve a figurinha ali. Toque nela para adicionar às favoritas.

Mantenha a janela aberta. Para parar, pressione **Ctrl+C**. Nas próximas vezes, abra iniciar.bat; a sessão fica salva neste computador.

## Uso

- **Imagem sem legenda:** imagem inteira dentro de 512 × 512, com margens transparentes quando necessário.
- **Imagem com legenda `!quadrada`:** recorte central para preencher o quadrado.
- **`!figurinha`:** responda uma imagem antiga com esse comando para convertê-la.
- **`!quadrada`:** também funciona como resposta a uma imagem antiga.
- **`!ajuda`:** instruções dentro do WhatsApp.

JPG, PNG e WebP são as opções recomendadas. Imagens enviadas como documento também são aceitas quando identificadas como imagem. O limite padrão é de 15 MB. O bot produz figurinhas estáticas; em formatos animados, usa o primeiro quadro. Mantém transparência existente, sem remover automaticamente o fundo. Grupos, canais, status e figurinhas recebidas são ignorados. Mensagens anteriores à inicialização não são convertidas automaticamente. A fila aceita até 20 solicitações simultâneas; se enviar mais, reenvie as que ficaram sem resposta depois.

## Usar um número separado para o bot

Se preferir enviar fotos de seu WhatsApp para um segundo número, conecte esse segundo número pelo QR. No arquivo `.env`, altere `BOT_MODE=self` para `BOT_MODE=private` e reinicie. Nesse modo, o bot responde às imagens recebidas de qualquer pessoa em conversas privadas. O padrão `self` responde somente à sua conversa com você mesmo.

Você também pode editar `STICKER_NAME` e `STICKER_AUTHOR` em `.env` para personalizar o pacote.

## Sessão e funcionamento

Esta solução usa [whatsapp-web.js](https://github.com/wwebjs/whatsapp-web.js), uma integração não oficial com WhatsApp Web. O projeto informa que há risco de bloqueio e que mudanças do WhatsApp podem interromper o funcionamento. Considere isso ao escolher a conta que vai conectar.

As imagens são processadas na memória do computador e não são gravadas pelo código do bot. O navegador e o WhatsApp podem manter cache. A página de conexão aceita acesso somente deste computador e apaga o QR da memória após autenticar. A pasta `.wwebjs_auth` contém a sessão de acesso: não compartilhe essa pasta nem a pasta inteira do bot depois de conectá-lo. Para revogar o acesso, desconecte o aparelho no WhatsApp do celular. Sessões, `.env`, dependências e registros locais são ignorados pelo Git.

## Se algo falhar

- **QR expirou:** escaneie o novo QR exibido na janela. Aumente a janela caso o desenho esteja quebrando em várias linhas.
- **Imagem sem resposta:** aguarde "Bot pronto!", confira o modo em `.env` e envie uma foto nova na conversa correta. Veja mensagens de erro na janela.
- **Navegador não encontrado:** execute `npm ci` na pasta. Como alternativa, configure `CHROME_PATH` em `.env` com o caminho completo de um Chrome instalado.
- **Sessão desconectada:** inicie novamente e reconecte pelo QR se solicitado.
- **Imagem inválida ou grande:** envie JPG/PNG/WebP menor. Além do limite de bytes, a decodificação aceita até 40 milhões de pixels.

## Para desenvolvimento

```powershell
npm ci
npm test
npm start
```

Os testes verificam conversão real para WebP, dimensões, transparência, limite de tamanho, filtros de conversa e fluxo de resposta com cliente simulado. A validação completa no WhatsApp exige conectar uma conta e enviar uma imagem de verdade.

Referências: [autenticação](https://wwebjs.dev/guide/creating-your-bot/authentication.html), [API do cliente](https://docs.wwebjs.dev/Client.html), [conversão Sharp](https://sharp.pixelplumbing.com/api-output/).
