import { customers } from './GlobalCustomers';

// Function to get clients subscribed to a specific business
function getCustomersForBusiness(businessId) {
  return customers.filter((customer) => {
    return (
      Array.isArray(customer.enrollments) && // Ensure enrollments exists
      customer.enrollments.some((enrollment) => enrollment.businessId === businessId)
    );
  });
}

// Example usage for a business with ID 1
const businessId = 90210; // Replace with dynamic business ID
const businessCustomers = getCustomersForBusiness(businessId);

// Log clients with enrollment and subscription details
businessCustomers.forEach((customer) => {
  console.log(`Customer: ${customer.name}`);
  const enrollment = customer.enrollments?.find((e) => e.businessId === businessId);
  
  if (enrollment) {
    console.log(`Enrolled in: ${enrollment.businessName} since ${enrollment.enrollmentStartDate}`);
    console.log(`Subscription: ${enrollment.subscription?.subscriptionName} since ${enrollment.subscription?.subscriptionStartDate}`);
    console.log(`Coins: ${customer.coins}`);
  } else {
    console.log('No enrollment found for this business.');
  }
});

export { getCustomersForBusiness };