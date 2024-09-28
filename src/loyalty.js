import { services } from './services';
// Loyalty Program Tiers
const tiers = [
  {
    id: 0,
    name: "New Enrollee",
    discount: 5, // 5% off all services
    gift: {
      serviceId: null,
      description: null
    },
    criteria: {
      spending: 0,
      membershipDuration: 0,
    },
    get criteriaDescription() {
      return `Automatically enrolled upon joining the loyalty program.`;
    }
  },
  {
    id: 1,
    name: "Bronze",
    discount: 7, // 7% off all services
    gift: {
      serviceId: services[6].name, // ID of the hand massage service
      description: services[6].description,
    },
    criteria: {
      spending: 100, // Spend $100
      membershipDuration: 3, // 3 months membership
    },
    get criteriaDescription() {
      return `Achieved by spending ${this.criteria.spending} and enrolled for ${this.criteria.membershipDuration} months`;
    }
  },
  {
    id: 2,
    name: "Silver",
    discount: 10, // 10% off all services
    gift: {
      serviceId: services[9].name, // ID of the paraffin treatment service
      description: services[9].description,
    },
    criteria: {
      spending: 300, // Spend $300
      membershipDuration: 6, // 6 months membership
    },
    get criteriaDescription() {
      return `Achieved by spending ${this.criteria.spending} and enrolled for ${this.criteria.membershipDuration} months`;
    }
  },
  {
    id: 3,
    name: "Gold",
    discount: 15, // 15% off all services
    gift: {
      serviceId: services[8].name, // ID of the spa pedicure or basic facial
      description: services[8].description,
    },
    criteria: {
      spending: 500, // Spend $500
      membershipDuration: 12, // 12 months membership
    },
    get criteriaDescription() {
      return `Achieved by spending ${this.criteria.spending} and enrolled for ${this.criteria.membershipDuration} months`;
    }
  },
];

// Admin Control Features (modify only)
const adminControls = {
  modifyTier: (tierId, updatedTier) => {
    const index = tiers.findIndex((tier) => tier.id === tierId);
    if (index !== -1) {
      tiers[index] = { ...tiers[index], ...updatedTier };
    }
  },
  trackCustomerProgress: (customer) => {
    // Logic to track customer progress (points, tier, history)
  },
  analyticsDashboard: () => {
    // Logic to provide insights like number of loyal customers, average spend per tier, etc.
  },
};

// Notifications and Referral Bonus Features
const notifications = {
  sendTierUpgrade: (customer, newTier) => {
    // Logic to notify customer when they move up a tier
  },
  sendRewardEarned: (customer, reward) => {
    // Logic to notify customer when they earn a reward
  },
};

const referralBonus = {
  applyBonus: (referringCustomer) => {
    // Logic to apply referral bonus or reward
  },
};

// Tier Benefits Overview
const tierBenefitsOverview = () => {
  return tiers.map((tier) => ({
    name: tier.name,
    discount: tier.discount,
    giftDescription: tier.gift.description,
  }));
};

export { tiers, adminControls, notifications, referralBonus, tierBenefitsOverview };
