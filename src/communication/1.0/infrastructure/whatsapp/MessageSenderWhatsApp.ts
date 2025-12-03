import { MessageSender } from '@communication/domain/MessageSender.js';
import { WhatsAppBody } from '@communication/infrastructure/whatsapp/dto/WhatsAppBody.js';
import { SendMessage } from '@communication/infrastructure/whatsapp/SendMessage.js';
import { WHATSAPP_INTERACTIVE_HEADER_TYPES, WHATSAPP_INTERACTIVE_TYPES, WHATSAPP_MESSAGE_TYPES } from '@communication/infrastructure/whatsapp/type/WhatsApp.js';
import { Config } from '@core/Config.js';
import { LOGGER, Logger } from '@core/domain/Logger.js';
import { Phone } from '@core/domain/valueObject/Phone.js';
import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';
import { inject } from 'inversify';

export class MessageSenderWhatsApp implements MessageSender {
  public constructor (
    @inject(Config) private config: Config,
    @inject(LOGGER) private logger: Logger,
    @inject(SendMessage) private sendMessage: SendMessage
  ) {}

  public async sendAuditorNotFound (phone: Phone): Promise<void> {
    const body = new WhatsAppBody({
      'messaging_product': 'whatsapp',
      'recipient_type': 'individual',
      'text': {
        'body': `📌 “El sistema de soporte es exclusivo para fiscales y colaboradores habilitados.

🤝 Si creés que se trata de un error, por favor comunicate con el referente de tu localidad o el coordinador de tu circuito de inmediato.`
      },
      'to': phone.toPrimitives(),
      'type': WHATSAPP_MESSAGE_TYPES.TEXT
    });

    await this.sendMessage.run(body);
  }

  public async sendEventsList (phone: Phone): Promise<void> {
    const body = new WhatsAppBody({
      'interactive': {
        'action': {
          'button': 'Mostrar incidencias',
          'sections': [
            {
              'rows': [
                {
                  'description': 'Faltan fiscales de mesa en esta escuela.',
                  'id': 'faltan_fiscales',
                  'title': 'Faltan fiscales'
                },
                {
                  'description': 'Necesito que alguien me reemplace como fiscal general.',
                  'id': 'necesito_reemplazo',
                  'title': 'Necesito reemplazo'
                },
                {
                  'description': 'Necesito contactar a mi coordinador.',
                  'id': 'contacto_coordinador',
                  'title': 'Contacto coordinador'
                },
                {
                  'description': 'Consultar dudas sobre el padrón, la boleta o la fiscalización.',
                  'id': 'dudas',
                  'title': 'Dudas'
                },
                {
                  'description': 'Problemas en la escuela: autoridades, lugar o votantes.',
                  'id': 'problemas_escuela',
                  'title': 'Problemas en escuela'
                },
                {
                  'description': 'Problemas generados con fiscales de otros partidos.',
                  'id': 'conflicto_fiscales',
                  'title': 'Conflicto - fiscales'
                },
                {
                  'description': 'Hay datos mal cargados en la app: escuela, fiscales o míos.',
                  'id': 'datos_mal_cargados',
                  'title': 'Datos mal cargados'
                },
                {
                  'description': 'Encontré un error en la app o no funciona correctamente.',
                  'id': 'fallas_app',
                  'title': 'Fallas en la app'
                },
                {
                  'description': 'Necesito que me acerquen comida o bebida.',
                  'id': 'comida_bebida',
                  'title': 'Comida o bebida'
                },
                {
                  'description': 'Tengo otro problema no listado.',
                  'id': 'otro_problema',
                  'title': 'Otro problema'
                }
              ],
              'title': 'Tipos de incidencia'
            }
          ]
        },
        'body': {
          'text': 'Seleccioná la situación o tipo de incidencia que querés reportar eligiendo del siguiente listado:'
        },
        'header': {
          'text': 'Elegí el tipo de incidencia',
          'type': WHATSAPP_INTERACTIVE_HEADER_TYPES.TEXT
        },
        'type': WHATSAPP_INTERACTIVE_TYPES.LIST
      },
      'messaging_product': 'whatsapp',
      'recipient_type': 'individual',
      'to': phone.toPrimitives(),
      'type': WHATSAPP_MESSAGE_TYPES.INTERACTIVE
    });

    await this.sendMessage.run(body);
  }

  public async sendSupportRequestConfirmation (phone: Phone): Promise<void> {
    const body = new WhatsAppBody({
      interactive: {
        action: {
          buttons: [
            {
              reply: {
                id: 'confirm_support',
                title: 'Ya le hable'
              },
              type: 'reply'
            },
            {
              reply: {
                id: 'cancel_support',
                title: 'No hable todavia'
              },
              type: 'reply'
            }
          ]
        },
        body: {
          text: `✨ *Antes de empezar:* recomendamos que las incidencias se consulten primero con el *referente de tu localidad* o el *coordinador de tu circuito electoral*.

 📌 Si no recibís respuesta, no te resultó útil o necesitás ayuda extra, podés comunicarte con *Soporte*.

*IMPORTANTE: No es posible recibir llamadas en este número.*`
        },
        type: WHATSAPP_INTERACTIVE_TYPES.BUTTON
      },
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone.toPrimitives(),
      type: WHATSAPP_MESSAGE_TYPES.INTERACTIVE
    });

    await this.sendMessage.run(body);
  }

  public async sendTextMessage (message: TrimmedString, phone: Phone): Promise<void> {
    const body = new WhatsAppBody({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      text: {
        body: message.toPrimitives()
      },
      to: phone.toPrimitives(),
      type: WHATSAPP_MESSAGE_TYPES.TEXT
    });

    await this.sendMessage.run(body);
  }
}
