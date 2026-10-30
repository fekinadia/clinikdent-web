// Rappels WhatsApp « en un geste » (2026-10-23) : préparation du message et
// du lien wa.me. Le message part du WhatsApp du cabinet (téléphone ou
// WhatsApp Web), gratuitement, sans API Meta.
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export type LangueMessage = 'fr' | 'ar';

// Textes proposés tant que le cabinet n'a pas créé son propre modèle
// « Rappel de rendez-vous » dans la langue du patient (Automatisation → WhatsApp).
// Une ligne contenant {{adresse}} ou {{carte}} disparaît si l'adresse du
// cabinet n'est pas renseignée.
export const RAPPEL_PAR_DEFAUT: Record<LangueMessage, string> = {
  fr:
    'Bonjour {{prenom}},\n' +
    'Nous vous rappelons votre rendez-vous du {{date}} à {{heure}} chez {{cabinet}}.\n' +
    '📍 {{adresse}}\n' +
    '{{carte}}\n' +
    'Merci de nous prévenir si vous ne pouvez pas venir. À bientôt !',
  ar:
    'مرحبا {{prenom}}،\n' +
    'نذكّرك بموعدك يوم {{date}} على الساعة {{heure}} في {{cabinet}}.\n' +
    '📍 {{adresse}}\n' +
    '{{carte}}\n' +
    'يرجى إعلامنا إذا لم تتمكن من الحضور. شكرا!',
};

// Réservation en ligne (2026-10-30) : réponse du cabinet à une demande.
export const REPONSE_DEMANDE: Record<'question' | 'confirmee' | 'refusee', Record<LangueMessage, string>> = {
  question: {
    fr: 'Bonjour {{prenom}},\nÀ propos de votre demande de rendez-vous du {{date}} à {{heure}} chez {{cabinet}} : ',
    ar: 'مرحبا {{prenom}}،\nبخصوص طلب موعدك يوم {{date}} على الساعة {{heure}} في {{cabinet}}: ',
  },
  confirmee: {
    fr:
      'Bonjour {{prenom}},\n' +
      'Votre rendez-vous du {{date}} à {{heure}} chez {{cabinet}} est confirmé.\n' +
      '📍 {{adresse}}\n' +
      '{{carte}}\n' +
      'À bientôt !',
    ar:
      'مرحبا {{prenom}}،\n' +
      'تم تأكيد موعدك يوم {{date}} على الساعة {{heure}} في {{cabinet}}.\n' +
      '📍 {{adresse}}\n' +
      '{{carte}}\n' +
      'إلى اللقاء!',
  },
  refusee: {
    fr:
      'Bonjour {{prenom}},\n' +
      "Nous ne pouvons pas vous recevoir le {{date}} à {{heure}}. Contactez-nous pour choisir un autre moment.\n" +
      '{{cabinet}}',
    ar:
      'مرحبا {{prenom}}،\n' +
      'لا يمكننا استقبالك يوم {{date}} على الساعة {{heure}}. يرجى الاتصال بنا لاختيار موعد آخر.\n' +
      '{{cabinet}}',
  },
};

/** Même règle que les liens WhatsApp de Recalls et Finance : numéro tunisien → 216XXXXXXXX. */
export function normaliserGsm(gsm: string): string {
  let digits = gsm.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `216${digits.slice(1)}`;
  else if (digits.length <= 8) digits = `216${digits}`;
  return digits;
}

export function lienWhatsApp(gsm: string, message: string): string {
  return `https://wa.me/${normaliserGsm(gsm)}?text=${encodeURIComponent(message)}`;
}

export function lienCarte(adresse: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
}

export function formatDateRappel(date: Date, langue: LangueMessage): string {
  if (langue === 'ar') {
    return new Intl.DateTimeFormat('ar-TN', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  }
  return format(date, 'EEEE d MMMM', { locale: fr });
}

export interface VariablesRappel {
  prenom: string;
  nom: string;
  cabinet: string;
  dentiste: string;
  date: string;
  heure: string;
  traitement: string;
  adresse: string;
  carte: string;
}

/** Remplace les {{variables}} du modèle ; retire les lignes d'adresse si elle est vide. */
export function remplirModele(contenu: string, vars: VariablesRappel): string {
  const lignes = contenu.split('\n').filter(
    (ligne) => vars.adresse.trim() !== '' || !/\{\{\s*(adresse|carte)\s*\}\}/.test(ligne),
  );
  return lignes
    .join('\n')
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, cle: string) =>
      cle in vars ? vars[cle as keyof VariablesRappel] : '',
    )
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Bornes [début, fin[ d'une journée à l'heure locale du navigateur (heure du cabinet). */
export function bornesJournee(jour: Date): { debut: Date; fin: Date } {
  const debut = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate());
  const fin = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate() + 1);
  return { debut, fin };
}
