// Informations du salon — à personnaliser librement.
// Ces valeurs alimentent la page d'accueil, le pied de page et les e-mails
// de confirmation. Aucune base de données n'est nécessaire pour ces
// champs : modifiez-les ici puis redéployez.

module.exports = {
  salonName: 'Atelier Nailise',
  tagline: 'Studio de manucure & beauté des mains',
  description:
    "Prothésiste Ongulaire"
  address: {
    line1: '26 rue Jean-Marie Prugnot',
    postalCode: '94450',
    city: 'Limeil-Brevannes',
    mapsUrl: '',
  },
  contact: {
    phone: '0768523556',
    phoneHref: '+33768523556',
    email: 'denise.tnailsart@icloud.com',
  },
  social: {
    instagram: 'https://instagram.com/atelier_nailise/',
    facebook: 'https://facebook.com/',
  },
  // Libellés affichés sur la page d'accueil pour chaque jour (doivent
  // rester cohérents avec les horaires enregistrés en base, modifiables
  // depuis l'espace admin > Disponibilités).
  hoursNote:
    "Sur rendez-vous uniquement. Merci de prévenir au moins 24h à l'avance en cas d'empêchement.",
  // Délai minimum (en minutes) avant un créneau pour qu'il reste réservable
  // aujourd'hui — évite qu'une cliente réserve un rendez-vous dans 5 minutes.
  minLeadTimeMinutes: 60,
  // Nombre de jours à l'avance ouverts à la réservation.
  bookingHorizonDays: 45,
  // Pas des créneaux proposés, en minutes.
  slotStepMinutes: 15,
  timezone: 'Europe/Paris',
};
