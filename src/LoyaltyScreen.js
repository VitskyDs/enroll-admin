import React, { useState } from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  InlineGrid,
  ButtonGroup,
  List,
  Modal,
  FormLayout,
  TextField,
  Select,
} from '@shopify/polaris';
import { tiers } from './loyalty'; // Import the tiers from the loyalty program
import { services } from './services'; // Import services for gift selection

function LoyaltyScreen() {
  const [editedTiers, setEditedTiers] = useState(tiers);
  const [activeModalTier, setActiveModalTier] = useState(null); // Control the tier being edited

  // Handle modal input changes for tier fields
  const handleInputChange = (field, value) => {
    if (!activeModalTier) return;
    setActiveModalTier({ ...activeModalTier, [field]: value });
  };

  // Handle gift selection change
  const handleGiftSelectionChange = (value) => {
    const selectedService = services.find((service) => service.id === value) || { name: 'No gift', description: 'No gift selected' };
    setActiveModalTier({ ...activeModalTier, gift: { ...selectedService } });
  };

  // Handle criteria input changes for spending
  const handleCriteriaInputChange = (field, value) => {
    if (!activeModalTier) return;
    setActiveModalTier({ ...activeModalTier, criteria: { ...activeModalTier.criteria, [field]: value } });
  };

  // Save changes and update tiers
  const saveChanges = () => {
    const updatedTiers = editedTiers.map((tier) =>
      tier.id === activeModalTier.id ? activeModalTier : tier
    );
    setEditedTiers(updatedTiers);
    setActiveModalTier(null); // Close modal
  };

  // Open modal for editing
  const openModal = (tier) => {
    setActiveModalTier(tier);
  };

  // Gift selection options
  const giftOptions = [
    { label: 'No gift', value: 'none' },
    ...services.map((service) => ({ label: service.name, value: service.id })),
  ];

  return (
    <Page title="Loyalty Program Management">
      <Layout>
        {editedTiers.map((tier) => (
          <Layout.Section key={tier.id}>
            <Card roundedAbove="sm">
              <BlockStack gap="200">
                <InlineGrid columns="1fr auto" alignItems="start">

                  <BlockStack>
                    <Text as="h2" variant="headingSm">
                      {tier.name}
                    </Text>
                    <Text as="p">
                      {`Achieved by spending $${tier.criteria.spending} and enrolled for ${tier.criteria.membershipDuration} months`}
                    </Text>
                  </BlockStack>

                  <ButtonGroup>
                    <Button variant="plain" onClick={() => openModal(tier)}>
                      Edit
                    </Button>
                  </ButtonGroup>
                </InlineGrid>
                <List>
                  <List.Item>
                    <strong>Discount:</strong> {tier.discount}% off all services
                  </List.Item>
                  <List.Item>
                    <strong>Gift:</strong> {tier.gift?.description || 'No gift'}
                  </List.Item>
                  <List.Item>
                    <strong>Criteria:</strong> Spend ${tier.criteria.spending}
                  </List.Item>
                </List>
              </BlockStack>
            </Card>
          </Layout.Section>
        ))}

        {/* Modal for editing tier */}
        {activeModalTier && (
          <Modal
            open={Boolean(activeModalTier)}
            onClose={() => setActiveModalTier(null)}
            title={`Edit ${activeModalTier.name} Tier`}
            primaryAction={{
              content: 'Save',
              onAction: saveChanges,
            }}
            secondaryActions={[
              {
                content: 'Cancel',
                onAction: () => setActiveModalTier(null),
              },
            ]}
          >
            <Modal.Section>
              <FormLayout>
                <TextField
                  label="Discount (%)"
                  type="number"
                  value={activeModalTier.discount}
                  onChange={(value) => handleInputChange('discount', value)}
                />
                <Select
                  label="Gift Service"
                  options={giftOptions}
                  value={activeModalTier.gift?.id || 'none'}
                  onChange={handleGiftSelectionChange}
                />
                <TextField
                  label="Gift Description"
                  value={activeModalTier.gift?.description || ''}
                  disabled
                />
                <TextField
                  label="Spending Criteria ($)"
                  type="number"
                  value={activeModalTier.criteria.spending}
                  onChange={(value) => handleCriteriaInputChange('spending', value)}
                />
              </FormLayout>
            </Modal.Section>
          </Modal>
        )}
      </Layout>
    </Page>
  );
}

export default LoyaltyScreen;
