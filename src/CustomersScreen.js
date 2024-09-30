import React, { useState, useCallback } from 'react';
import {
  Page,
  Card,
  IndexTable,
  Filters,
  TextField,
  Badge,
} from '@shopify/polaris';
import { customers } from './GlobalCustomers'; // Import global customers

function CustomerTable({ businessId }) {
  const [queryValue, setQueryValue] = useState('');
  const [status, setStatus] = useState(null);
  const [coins, setCoins] = useState(null);

  // Filter customers based on the business they are enrolled in
  const businessCustomers = customers.filter((customer) =>
    customer.enrollments.some((enrollment) => enrollment.businessId === 90210)
  );

  // Search and filter logic
  const handleQueryChange = useCallback((value) => setQueryValue(value), []);
  const handleStatusChange = useCallback((value) => setStatus(value), []);
  const handleCoinsChange = useCallback((value) => setCoins(value), []);

  const filteredCustomers = businessCustomers.filter((customer) => {
    const matchesQuery = queryValue === '' || customer.name.toLowerCase().includes(queryValue.toLowerCase());
    const matchesCoins = coins === null || customer.coins >= parseInt(coins, 10);
    return matchesQuery && matchesCoins;
  });

  // Polaris filters
  const filters = [
    {
      key: 'coins',
      label: 'Coins',
      filter: (
        <TextField
          label="Minimum Coins"
          value={coins || ''}
          onChange={handleCoinsChange}
          type="number"
          autoComplete="off"
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters = [];
  if (coins) {
    appliedFilters.push({
      key: 'coins',
      label: `Coins greater than ${coins}`,
      onRemove: () => setCoins(null),
    });
  }

  // Row markup for each customer
  const rowMarkup = filteredCustomers.map((customer, index) => (
    <IndexTable.Row id={customer.id} key={customer.id} position={index}>
      <IndexTable.Cell>{customer.name}</IndexTable.Cell>
      <IndexTable.Cell>{customer.email}</IndexTable.Cell>
      <IndexTable.Cell>{customer.phone}</IndexTable.Cell>
      <IndexTable.Cell>{customer.coins} coins</IndexTable.Cell>
      <IndexTable.Cell>
        {customer.enrollments.map((enrollment, i) => (
          <div key={i}>
            <Badge>{enrollment.businessName}</Badge>: {enrollment.subscription.subscriptionName} <br />
            Enrollment Start: {enrollment.enrollmentStartDate} <br />
            Subscription Start: {enrollment.subscription.subscriptionStartDate}
          </div>
        ))}
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page title="Customers">
      <Card>
        <Filters
          queryValue={queryValue}
          filters={filters}
          appliedFilters={appliedFilters}
          onQueryChange={handleQueryChange}
          onClearAll={() => setQueryValue('')}
        />
        <IndexTable
          resourceName={{ singular: 'customer', plural: 'customers' }}
          itemCount={filteredCustomers.length}
          headings={[
            { title: 'Name' },
            { title: 'Email' },
            { title: 'Phone' },
            { title: 'Coins' },
            { title: 'Enrollments' },
          ]}
          selectable={false}
        >
          {rowMarkup}
        </IndexTable>
      </Card>
    </Page>
  );
}

export default CustomerTable;
