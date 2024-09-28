// Service categories
const categories = ['Nails', 'Add-Ons', 'Waxing & Beauty', 'Lash Extensions', 'Skincare', 'Wellness'];

// Services data with IDs
const services = [
  { 
    id: 'classicManicure',
    name: 'Classic Manicure', 
    cost: 25, 
    subscriptionCost: 20, 
    duration: 30, 
    category: categories[0], 
    description: 'A classic manicure to keep your nails looking clean and neat.' 
  },
  { 
    id: 'gelManicure',
    name: 'Gel Manicure', 
    cost: 40, 
    subscriptionCost: 35, 
    duration: 45, 
    category: categories[0], 
    description: 'A gel manicure that lasts longer and gives a shiny finish.' 
  },
  { 
    id: 'spaPedicure',
    name: 'Spa Pedicure', 
    cost: 50, 
    subscriptionCost: 45, 
    duration: 60, 
    category: categories[0], 
    description: 'A relaxing spa pedicure for soft, smooth feet.' 
  },
  { 
    id: 'acrylicFullSet',
    name: 'Acrylic Full Set', 
    cost: 60, 
    subscriptionCost: 55, 
    duration: 90, 
    category: categories[0], 
    description: 'A full set of acrylic nails for added strength and style.' 
  },
  { 
    id: 'dipPowderNails',
    name: 'Dip Powder Nails', 
    cost: 45, 
    duration: 60, 
    category: categories[0], 
    description: 'Durable dip powder nails with vibrant colors.' 
  }, // No subscription cost
  { 
    id: 'frenchManicure',
    name: 'French Manicure', 
    cost: 35, 
    subscriptionCost: 30, 
    duration: 40, 
    category: categories[0], 
    description: 'A classic French manicure with a white tip.' 
  },
  { 
    id: 'nailArt',
    name: 'Nail Art (Add-On)', 
    cost: 15, 
    duration: 20, 
    category: categories[1], 
    description: 'Custom nail art to complement any manicure.' 
  }, // No subscription cost
  { 
    id: 'paraffinTreatment',
    name: 'Paraffin Treatment', 
    cost: 20, 
    duration: 15, 
    category: categories[1], 
    description: 'A moisturizing paraffin treatment for soft hands.' 
  }, // No subscription cost
  { 
    id: 'eyebrowWaxing',
    name: 'Eyebrow Waxing', 
    cost: 20, 
    duration: 20, 
    category: categories[2], 
    description: 'Get perfectly shaped brows with eyebrow waxing.' 
  }, // No subscription cost
  { 
    id: 'lashExtensions',
    name: 'Lash Extensions (Full Set)', 
    cost: 150, 
    subscriptionCost: 140, 
    duration: 120, 
    category: categories[3], 
    description: 'Full set of lash extensions for a glamorous look.' 
  },
  { 
    id: 'basicFacial',
    name: 'Basic Facial', 
    cost: 60, 
    subscriptionCost: 50, 
    duration: 50, 
    category: categories[4], 
    description: 'A basic facial to cleanse and rejuvenate your skin.' 
  },
  { 
    id: 'handFootMassage',
    name: 'Hand & Foot Massage', 
    cost: 30, 
    duration: 30, 
    category: categories[5], 
    description: 'A relaxing hand and foot massage for stress relief.' 
  }, // No subscription cost
];

// Bundles data with IDs
const bundles = [
  {
    id: 'refreshBundle',
    name: 'Refresh',
    cost: 45,
    subscriptionCost: 36,
    duration: 30,
    category: categories[0],
    services: ['Classic Manicure', 'Gel Manicure'],
    description: 'A refreshing combo of Classic and Gel Manicure for a quick touch-up.'
  },
  {
    id: 'signatureBundle',
    name: 'Signature',
    cost: 55,
    subscriptionCost: 44,
    duration: 45,
    category: categories[0],
    services: ['Classic Manicure', 'French Manicure'],  // Bundle multiple services
    description: 'A signature experience with a Classic and French Manicure combo.'
  },
  {
    id: 'luxuryBundle',
    name: 'Luxury',
    cost: 65,
    subscriptionCost: 56,
    duration: 60,
    category: categories[0],
    services: ['Classic Manicure', 'Spa Pedicure', 'Nail Art (Add-On)'],
    description: 'A luxury package with a manicure, pedicure, and custom nail art.'
  },
];

export { services, bundles, categories };
