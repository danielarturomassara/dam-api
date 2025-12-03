import { SendTextMessage } from '@communication/application/SendTextMessage.js';
import { Subscribe } from '@communication/application/Subscribe.js';
import { MESSAGE_SENDER, MessageSender } from '@communication/domain/MessageSender.js';
import { ChatwootApi } from '@communication/infrastructure/chatwoot/ChatwootApi.js';
import { MessageSenderWhatsApp } from '@communication/infrastructure/whatsapp/MessageSenderWhatsApp.js';
import { SendMessage } from '@communication/infrastructure/whatsapp/SendMessage.js';
import { ContainerModule, ContainerModuleLoadOptions } from 'inversify';

export default new ContainerModule((options: ContainerModuleLoadOptions) => {
  options.bind<SendMessage>(SendMessage).toSelf();
  options.bind<ChatwootApi>(ChatwootApi).toSelf().inSingletonScope();
  options.bind<MessageSender>(MESSAGE_SENDER).to(MessageSenderWhatsApp);
  options.bind<SendTextMessage>(SendTextMessage).toSelf();
  options.bind<Subscribe>(Subscribe).toSelf();
});
