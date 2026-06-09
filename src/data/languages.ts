import type { Lang } from './keywords';
import type { RepromptReason } from '../types/parsedOrder';

export type AppLang = Lang;

export type LanguageOption = {
  id: AppLang;
  label: string;
  short: string;
  speech: string;
};

export const LANGUAGES: LanguageOption[] = [
  { id: 'fr', label: 'Français', short: 'FR', speech: 'fr-FR' },
  { id: 'en', label: 'English', short: 'EN', speech: 'en-US' },
  { id: 'vi', label: 'Tiếng Việt', short: 'VI', speech: 'vi-VN' },
];

/** Vietnamese UI is dev-only; hidden from production builds. */
export const VI_ENABLED = !import.meta.env.PROD;

export const VISIBLE_LANGUAGES: LanguageOption[] = VI_ENABLED
  ? LANGUAGES
  : LANGUAGES.filter((l) => l.id !== 'vi');

export const DEFAULT_LANG: AppLang = 'fr';

export function isLangVisible(id: AppLang): boolean {
  return id !== 'vi' || VI_ENABLED;
}

export function getLanguage(id: AppLang): LanguageOption {
  const resolved = isLangVisible(id) ? id : DEFAULT_LANG;
  return LANGUAGES.find((l) => l.id === resolved) ?? LANGUAGES[0];
}

export const voiceUi: Record<
  AppLang,
  {
    idle: string;
    listening: string;
    ready: string;
    stop: string;
    unsupported: string;
    gesture: string;
    micAriaActive: string;
  }
> = {
  fr: {
    idle: 'Parlez maintenant…',
    listening: '…',
    ready: 'Parlez — remplissage dès que c’est entendu',
    stop: 'Appuyez à nouveau pour arrêter',
    unsupported: 'Reconnaissance vocale non supportée',
    gesture: 'Cliquez sur le micro pour autoriser l’écoute',
    micAriaActive: 'Microphone actif — écoute automatique',
  },
  en: {
    idle: 'Speak now…',
    listening: '…',
    ready: 'Speak — fills as soon as it’s heard',
    stop: 'Tap again to stop',
    unsupported: 'Speech recognition not supported',
    gesture: 'Click the mic to allow listening',
    micAriaActive: 'Microphone active — automatic listening',
  },
  vi: {
    idle: 'Nói ngay bây giờ…',
    listening: '…',
    ready: 'Nói — nhận và điền ngay khi nghe được',
    stop: 'Bấm lại để dừng',
    unsupported: 'Trình duyệt không hỗ trợ nhận giọng nói',
    gesture: 'Bấm vào micro để cho phép nghe',
    micAriaActive: 'Micro luôn bật — tự nhận khi bạn nói',
  },
};

export const EMPTY_REQUEST_ICON = '/img/chat_12707694.gif';
export const EMPTY_PRODUCTS_ICON = '/img/receipt_11188760.gif';

export const emptyUi: Record<AppLang, { request: string }> = {
  fr: { request: 'Veuillez indiquer votre demande' },
  en: { request: 'Please state your request' },
  vi: { request: 'Vui lòng nói yêu cầu' },
};

export const productEmptyUi: Record<AppLang, { title: string; hint: string }> = {
  fr: {
    title: 'Parlez ou saisissez une commande',
    hint: 'Un ou plusieurs produits seront ajoutés ici',
  },
  en: {
    title: 'Speak or type an order',
    hint: 'One or more products will be added here',
  },
  vi: {
    title: 'Nói hoặc nhập đơn hàng',
    hint: 'Một hoặc nhiều sản phẩm sẽ được thêm vào đây',
  },
};

export const actionUi: Record<AppLang, { ignoreBadge: string }> = {
  fr: { ignoreBadge: 'Ignoré' },
  en: { ignoreBadge: 'Ignored' },
  vi: { ignoreBadge: 'Bỏ qua' },
};

export const chatUi: Record<AppLang, { title: string }> = {
  fr: { title: 'Message utilisateur' },
  en: { title: 'User message' },
  vi: { title: 'Tin nhắn người dùng' },
};

export const bonUi: Record<AppLang, { open: string; openAria: string }> = {
  fr: { open: 'Bon de commande', openAria: 'Ouvrir le bon de commande client' },
  en: { open: 'Purchase order', openAria: 'Open client purchase order' },
  vi: { open: 'Phiếu đặt hàng', openAria: 'Mở phiếu đặt hàng khách hàng' },
};

export const validateUi: Record<AppLang, { empty: string; aria: string }> = {
  fr: {
    empty: 'Ajoutez au moins un produit avant de valider la commande.',
    aria: 'Valider la commande et afficher le bon de commande',
  },
  en: {
    empty: 'Add at least one product before validating the order.',
    aria: 'Validate order and open purchase order',
  },
  vi: {
    empty: 'Thêm ít nhất một sản phẩm trước khi xác nhận đơn.',
    aria: 'Xác nhận đơn và mở phiếu đặt hàng',
  },
};

export const textInputUi: Record<
  AppLang,
  { label: string; placeholder: string; sendAria: string; error: string }
> = {
  fr: {
    label: 'Saisie Texte (Alternative)',
    placeholder: 'Ex. Tomates ajoutées — 200 kg',
    sendAria: 'Envoyer la commande',
    error: 'Commande non reconnue — essayez\u00a0: «\u00a0Tomates ajoutées — 200 kg\u00a0»',
  },
  en: {
    label: 'Text Entry (Alternative)',
    placeholder: 'E.g. Tomatoes added — 200 kg',
    sendAria: 'Send order',
    error: 'Order not recognized — try: « Tomatoes added — 200 kg »',
  },
  vi: {
    label: 'Nhập văn bản (Thay thế)',
    placeholder: 'VD: thêm 150 cagette rau xà lách',
    sendAria: 'Gửi đơn hàng',
    error: 'Không nhận dạng được — thử: « thêm 200 kg cà chua »',
  },
};

type RepromptMessageKey = Exclude<RepromptReason, ''>;

export const repromptUi: Record<AppLang, Record<RepromptMessageKey, string>> = {
  fr: {
    missingClient:
      'Je n’ai pas bien entendu le client. Pouvez-vous répéter le nom du client\u00a0?',
    missingDate:
      'Je n’ai pas bien entendu la date de livraison. Pouvez-vous la répéter\u00a0?',
    missingQuantity:
      'J’ai entendu le produit mais pas la quantité. Pouvez-vous répéter la quantité\u00a0?',
    noValidItems:
      'Je n’ai pas détecté de ligne produit valide. Reformulez la commande.',
    unknownProduct:
      'Ce produit n’est pas dans le dictionnaire. Utilisez un nom de la liste prise en charge.',
  },
  en: {
    missingClient: 'I didn’t catch the client name. Please say the client name again.',
    missingDate: 'I didn’t catch the delivery date. Please say the delivery date again.',
    missingQuantity: 'I heard the product but not the quantity. Please say the quantity again.',
    noValidItems: 'I didn’t detect a valid product line. Please repeat your order.',
    unknownProduct:
      'This product isn’t in the dictionary. Please use a name from the supported list.',
  },
  vi: {
    missingClient: 'Mình chưa nghe rõ khách hàng. Bạn nói lại tên khách hàng một lần nữa giúp mình.',
    missingDate: 'Mình chưa nghe rõ ngày giao hàng. Bạn nói lại ngày giao hàng một lần nữa giúp mình.',
    missingQuantity:
      'Mình nghe được sản phẩm nhưng chưa rõ số lượng. Bạn nói lại số lượng một lần nữa giúp mình.',
    noValidItems:
      'Mình chưa bắt được dòng sản phẩm hợp lệ. Bạn nói lại đơn hàng giúp mình.',
    unknownProduct:
      'Sản phẩm này chưa có trong từ điển. Bạn nói lại bằng tên sản phẩm trong danh sách hỗ trợ giúp mình.',
  },
};

export function getRepromptMessage(lang: AppLang, reason: RepromptReason): string {
  if (!reason) return '';
  return repromptUi[lang][reason];
}
