import type { SgLocale } from '../types'

/** French (fr-FR) preset for {@link SgConfigProvider} `locale`. */
export const fr_FR: SgLocale = {
  modal: {
    okText: 'OK',
    cancelText: 'Annuler',
    closeAriaLabel: 'Fermer',
  },
  popconfirm: {
    okText: 'Oui',
    cancelText: 'Non',
  },
  empty: {
    description: 'Aucune donnée',
  },
  pagination: {
    totalPrefix: 'Total',
    itemsPerPage: ' / page',
    jump: 'Aller à',
    page: 'page',
    ariaLabel: 'Pagination',
  },
  inputPassword: {
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    strengthWeak: 'Faible',
    strengthMedium: 'Moyen',
    strengthStrong: 'Fort',
    strengthVeryStrong: 'Très fort',
  },
  searchInput: {
    placeholder: 'Rechercher…',
    clear: 'Effacer',
    search: 'Rechercher',
  },
  tagInput: {
    placeholder: 'Ajouter un tag…',
    removeTag: 'Supprimer',
  },
  pinInput: {
    ariaLabel: 'Saisie PIN',
  },
  inlineEdit: {
    placeholder: 'Cliquer pour modifier…',
    save: 'Enregistrer',
    cancel: 'Annuler',
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
    month: 'Mois',
    year: 'Année',
  },
  datePicker: {
    prevYear: 'Année précédente',
    nextYear: 'Année suivante',
    prevMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
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
  cascader: {
    searchPlaceholder: 'Rechercher...',
    noMatches: 'Aucun résultat',
    clear: 'Effacer',
    removeTag: 'Supprimer',
  },
  treeSelect: {
    searchPlaceholder: 'Rechercher...',
    noMatches: 'Aucun résultat',
  },
  tree: {
    clearSearch: 'Effacer la recherche',
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
  diagram: {
    ariaLabel: 'Diagramme',
  },
  dataGrid: {
    selectAllRows: 'Sélectionner toutes les lignes',
    selectRow: 'Sélectionner la ligne',
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
  list: {
    loading: 'Chargement',
  },
  table: {
    selectAll: 'Tout sélectionner',
  },
  input: {
    clear: 'Effacer',
  },
  colorPicker: {
    pickColor: 'Choisir une couleur',
  },
}
