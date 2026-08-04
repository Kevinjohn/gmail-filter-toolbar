#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { writeFileBatch } from './utils/write-file-batch.mjs';

const translations = {
  ar: [
    'تجريبي',
    'الميزات التجريبية قيد الاختبار النشط وقد تتغير.',
    'إظهار زر الذكاء الاصطناعي والنسخ',
    'الذكاء الاصطناعي والملاحظات',
    'إظهار زر إشعارات المطورين',
  ],
  cs: [
    'Experimentální',
    'Experimentální funkce se aktivně testují a mohou se změnit.',
    'Zobrazit tlačítko AI a přepisu',
    'AI a poznámky',
    'Zobrazit tlačítko vývojářských oznámení',
  ],
  da: [
    'Eksperimentel',
    'Eksperimentelle funktioner testes aktivt og kan ændres.',
    'Vis knappen AI og transskription',
    'AI og noter',
    'Vis knappen udviklermeddelelser',
  ],
  de: [
    'Experimentell',
    'Experimentelle Funktionen werden aktiv getestet und können sich ändern.',
    'Schaltfläche für KI und Transkription anzeigen',
    'KI und Notizen',
    'Schaltfläche für Entwicklerbenachrichtigungen anzeigen',
  ],
  el: [
    'Πειραματικό',
    'Οι πειραματικές λειτουργίες δοκιμάζονται ενεργά και ενδέχεται να αλλάξουν.',
    'Εμφάνιση κουμπιού AI και μεταγραφής',
    'AI και σημειώσεις',
    'Εμφάνιση κουμπιού ειδοποιήσεων προγραμματιστών',
  ],
  es: [
    'Experimental',
    'Las funciones experimentales están en pruebas activas y pueden cambiar.',
    'Mostrar el botón de IA y transcripción',
    'IA y notas',
    'Mostrar el botón de notificaciones de desarrollo',
  ],
  es_419: [
    'Experimental',
    'Las funciones experimentales están en pruebas activas y pueden cambiar.',
    'Mostrar el botón de IA y transcripción',
    'IA y notas',
    'Mostrar el botón de notificaciones para desarrolladores',
  ],
  fi: [
    'Kokeellinen',
    'Kokeellisia ominaisuuksia testataan aktiivisesti, ja ne voivat muuttua.',
    'Näytä tekoäly- ja litterointipainike',
    'Tekoäly ja muistiinpanot',
    'Näytä kehittäjäilmoitusten painike',
  ],
  fr: [
    'Expérimental',
    'Les fonctionnalités expérimentales sont en cours de test et peuvent changer.',
    'Afficher le bouton IA et transcription',
    'IA et notes',
    'Afficher le bouton des notifications de développement',
  ],
  hi: [
    'प्रायोगिक',
    'प्रायोगिक सुविधाओं का सक्रिय परीक्षण चल रहा है और वे बदल सकती हैं।',
    'AI और ट्रांसक्रिप्शन बटन दिखाएँ',
    'AI और नोट्स',
    'डेवलपर सूचनाएँ बटन दिखाएँ',
  ],
  hu: [
    'Kísérleti',
    'A kísérleti funkciók aktív tesztelés alatt állnak és változhatnak.',
    'AI és átírás gomb megjelenítése',
    'AI és jegyzetek',
    'Fejlesztői értesítések gomb megjelenítése',
  ],
  it: [
    'Sperimentale',
    'Le funzionalità sperimentali sono in fase di test e possono cambiare.',
    'Mostra il pulsante IA e trascrizione',
    'IA e note',
    'Mostra il pulsante delle notifiche per sviluppatori',
  ],
  nl: [
    'Experimenteel',
    'Experimentele functies worden actief getest en kunnen wijzigen.',
    'Knop AI en transcriptie tonen',
    'AI en notities',
    'Knop ontwikkelaarsmeldingen tonen',
  ],
  no: [
    'Eksperimentell',
    'Eksperimentelle funksjoner testes aktivt og kan endres.',
    'Vis knappen KI og transkripsjon',
    'KI og notater',
    'Vis knappen for utviklervarsler',
  ],
  pl: [
    'Eksperymentalne',
    'Funkcje eksperymentalne są aktywnie testowane i mogą się zmienić.',
    'Pokaż przycisk AI i transkrypcji',
    'AI i notatki',
    'Pokaż przycisk powiadomień deweloperskich',
  ],
  pt_BR: [
    'Experimental',
    'Os recursos experimentais estão em testes ativos e podem mudar.',
    'Mostrar botão de IA e transcrição',
    'IA e notas',
    'Mostrar botão de notificações para desenvolvedores',
  ],
  pt_PT: [
    'Experimental',
    'As funcionalidades experimentais estão em testes ativos e podem mudar.',
    'Mostrar botão de IA e transcrição',
    'IA e notas',
    'Mostrar botão de notificações de programador',
  ],
  ro: [
    'Experimental',
    'Funcțiile experimentale sunt testate activ și se pot modifica.',
    'Afișează butonul AI și transcriere',
    'AI și notițe',
    'Afișează butonul pentru notificări de dezvoltare',
  ],
  ru: [
    'Экспериментальные функции',
    'Экспериментальные функции активно тестируются и могут измениться.',
    'Показывать кнопку ИИ и расшифровки',
    'ИИ и заметки',
    'Показывать кнопку уведомлений разработчика',
  ],
  sv: [
    'Experimentellt',
    'Experimentella funktioner testas aktivt och kan ändras.',
    'Visa knappen AI och transkribering',
    'AI och anteckningar',
    'Visa knappen för utvecklaraviseringar',
  ],
  tr: [
    'Deneysel',
    'Deneysel özellikler aktif olarak test edilmektedir ve değişebilir.',
    'Yapay zekâ ve transkripsiyon düğmesini göster',
    'Yapay zekâ ve notlar',
    'Geliştirici bildirimleri düğmesini göster',
  ],
  uk: [
    'Експериментальні функції',
    'Експериментальні функції активно тестуються й можуть змінюватися.',
    'Показувати кнопку ШІ та транскрибування',
    'ШІ та нотатки',
    'Показувати кнопку сповіщень розробника',
  ],
  zh_CN: [
    '实验性功能',
    '实验性功能正在积极测试中，可能会发生变化。',
    '显示 AI 与转录按钮',
    'AI 与笔记',
    '显示开发者通知按钮',
  ],
};

const renderedLocales = [];
for (const [locale, values] of Object.entries(translations)) {
  const file = path.join('src', '_locales', locale, 'messages.json');
  const messages = JSON.parse(readFileSync(file, 'utf8'));
  for (const key of [
    'extension_name',
    'experimental_legend',
    'experimental_description',
    'options_show_ai_notetakers',
    'btn_ai_notetakers',
    'options_show_dev_notifications',
  ]) {
    if (!messages[key] || typeof messages[key].message !== 'string') {
      throw new Error(`${file} is missing a valid ${key}.message`);
    }
  }
  messages.extension_name.message = 'Sift: A Filter Toolbar for Gmail';
  messages.experimental_legend.message = values[0];
  messages.experimental_description.message = values[1];
  messages.options_show_ai_notetakers.message = values[2];
  messages.btn_ai_notetakers.message = values[3];
  messages.options_show_dev_notifications.message = values[4];
  renderedLocales.push([file, `${JSON.stringify(messages, null, 2)}\n`]);
}

// Validate and render the complete batch before changing the first locale. A malformed late file
// therefore cannot leave earlier locale files partially updated.
writeFileBatch(renderedLocales);
