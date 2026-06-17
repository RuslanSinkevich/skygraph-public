import type { SgLocale } from '../types/locale'

/**
 * French (fr-FR) locale preset for {@link ConfigProvider}.
 *
 * Mirrors the structure of {@link en_US}; values translated for general
 * UI use. Identifiers, `sg-*` class names and unicode glyphs are not
 * translated (see CHARTER §10).
 */
export const fr_FR: SgLocale = {
  empty: {
    description: 'Aucune donnée',
  },
  pagination: {
    totalPrefix: 'Total',
    itemsPerPage: '/ page',
    jump: 'Aller à',
    page: 'page',
    ariaLabel: 'Pagination',
  },
  popconfirm: {
    okText: 'Oui',
    cancelText: 'Non',
  },
  modal: {
    okText: 'OK',
    cancelText: 'Annuler',
    closeAriaLabel: 'Fermer',
  },
  form: {
    required: '*',
    optional: '(facultatif)',
    submitText: 'Envoyer',
    resetText: 'Réinitialiser',
  },
  upload: {
    uploadText: 'Téléverser',
    removeFile: 'Supprimer le fichier',
    uploadError: 'Échec du téléversement',
    previewFile: 'Aperçu',
    uploadAriaLabel: 'Téléverser un fichier',
  },
  transfer: {
    titles: ['Source', 'Cible'],
    searchPlaceholder: 'Rechercher',
    itemUnit: 'élément',
    itemsUnit: 'éléments',
    notFoundContent: 'Introuvable',
    selectAll: 'Tout sélectionner',
    deselectAll: 'Tout désélectionner',
  },
  calendar: {
    monthNames: [
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
    ],
    dayNames: ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
    today: "Aujourd'hui",
    now: 'Maintenant',
    week: 'Sem',
    prevYear: 'Année précédente',
    nextYear: 'Année suivante',
    prevMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
  },
  input: {
    clear: 'Effacer',
  },
  inputPassword: {
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
  },
  searchInput: {
    clear: 'Effacer',
  },
  inlineEdit: {
    save: 'Enregistrer',
    cancel: 'Annuler',
  },
  tagInput: {
    removeTag: (tag) => `Supprimer ${tag}`,
  },
  drawer: {
    closeAriaLabel: 'Fermer',
  },
  notification: {
    closeAriaLabel: 'Fermer',
  },
  tag: {
    closeAriaLabel: 'Fermer',
  },
  spin: {
    loading: 'Chargement',
  },
  skeleton: {
    loading: 'Chargement',
  },
  breadcrumb: {
    ariaLabel: "Fil d'Ariane",
  },
  carousel: {
    slide: (index) => `Diapositive ${index}`,
  },
  rate: {
    ariaLabel: 'Évaluation',
    star: (n) => `${n} étoile${n > 1 ? 's' : ''}`,
  },
  charts: {
    lineChart: 'Graphique en courbes',
    barChart: 'Graphique à barres',
    areaChart: 'Graphique en aires',
    pieChart: 'Graphique en secteurs',
    legend: 'Légende du graphique',
    actions: 'Actions du graphique',
  },
  datePicker: {
    prevYear: 'Année précédente',
    nextYear: 'Année suivante',
    prevMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
  },
  cascader: {
    searchPlaceholder: 'Rechercher...',
    noMatches: 'Aucun résultat',
  },
  treeSelect: {
    searchPlaceholder: 'Rechercher...',
    noMatches: 'Aucun résultat',
  },
  dashboard: {
    ariaLabel: 'Tableau de bord',
    editorAriaLabel: 'Éditeur du tableau de bord',
    resizeWidget: 'Redimensionner le widget',
    widgetActions: 'Actions du widget',
  },
  gantt: {
    ariaLabel: 'Diagramme de Gantt',
    resizeTask: 'Redimensionner la tâche',
  },
  resourceCalendar: {
    ariaLabel: 'Calendrier des ressources',
    resource: (name) => `Ressource ${name}`,
    capacity: (n) => `capacité ${n} par créneau`,
    resizeStart: 'Redimensionner le début',
    resizeEnd: 'Redimensionner la fin',
    conflictSuffix: ' (conflit)',
  },
  timeline: {
    ariaLabel: 'Chronologie',
  },
  schemaFormEditor: {
    undo: 'Annuler',
    redo: 'Rétablir',
    removeOption: "Supprimer l'option",
    schemaView: 'Schéma JSON généré',
    optionLabelPlaceholder: 'Libellé',
    optionValuePlaceholder: 'Valeur',
    moveFieldUp: 'Déplacer vers le haut',
    moveFieldDown: 'Déplacer vers le bas',
    duplicateField: 'Dupliquer le champ',
    deleteField: 'Supprimer le champ',
  },
  table: {
    emptyText: 'Aucune donnée',
    searchPlaceholder: 'Rechercher...',
  },
  dataGrid: {
    noData: 'Aucune donnée',
    selectAll: 'Tout sélectionner',
  },
  tree: {
    emptyText: 'Aucune donnée',
    searchPlaceholder: 'Rechercher...',
    clearSearch: 'Effacer la recherche',
  },
  list: {
    loading: 'Chargement',
  },
  diagram: {
    ariaLabel: 'Diagramme',
  },
  colorPicker: {
    pickColor: 'Choisir une couleur',
  },
  pinInput: {
    ariaLabel: 'Saisie du code PIN',
  },
}
