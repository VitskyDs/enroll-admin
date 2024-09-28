// Global list of customers
const customers = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '555-1234',
    coins: 150,
    enrollments: [
      {
        businessId: 90210,
        businessName: 'Nail Studio',
        subscription: {
          subscriptionId: 'basicSubscription',
          subscriptionName: 'Basic Nail Package',
          subscriptionStartDate: '2024-01-01',
        },
        enrollmentStartDate: '2024-01-01',
      },
    ],
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '555-5678',
    coins: 250,
    enrollments: [
      {
        businessId: 2,
        businessName: 'Spa Center',
        subscription: {
          subscriptionId: 'premiumSubscription',
          subscriptionName: 'Premium Spa Package',
          subscriptionStartDate: '2024-02-01',
        },
        enrollmentStartDate: '2024-02-01',
      },
      {
        businessId: 90210,
        businessName: 'Nail Studio',
        subscription: {
          subscriptionId: 'basicSubscription',
          subscriptionName: 'Basic Nail Package',
          subscriptionStartDate: '2024-03-01',
        },
        enrollmentStartDate: '2024-03-01',
      },
    ],
  },
  // Additional customers can be added here...
];

export { customers };
