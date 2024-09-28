import React, { useState, useCallback } from 'react';
import { Page, Layout, DataTable, Tabs, Button, Modal, FormLayout, TextField, ButtonGroup, Select } from '@shopify/polaris';
import { services as initialServices, bundles, categories as initialCategories } from './services'; // Import services, bundles, categories
import business from './business'; // Import business for currency

function ServicesScreen() {
  const [selectedTab, setSelectedTab] = useState(0); // Manage which tab is selected
  const [activeModal, setActiveModal] = useState(false); // Manage modal state
  const [services, setServices] = useState(initialServices); // Store services in component state
  const [categories, setCategories] = useState(initialCategories); // Store categories in state
  const [newService, setNewService] = useState({ name: '', cost: '', subscriptionCost: '', duration: '', category: '', description: '' }); // New service state
  const [newCategory, setNewCategory] = useState(''); // New category state

  // Handle tab change
  const handleTabChange = useCallback((selectedTabIndex) => setSelectedTab(selectedTabIndex), []);

  // Handle modal open/close
  const toggleModal = useCallback(() => setActiveModal((active) => !active), []);

  // Handle form input changes
  const handleInputChange = (field) => (value) => {
    setNewService({ ...newService, [field]: value });
  };

  // Handle adding a new category
  const addCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]); // Add new category
    }
    setNewCategory(''); // Reset category input
  };

  // Handle form submission to add the new service
  const handleSubmit = () => {
    const newServiceEntry = {
      name: newService.name,
      cost: parseFloat(newService.cost),
      subscriptionCost: newService.subscriptionCost ? parseFloat(newService.subscriptionCost) : undefined,
      duration: parseInt(newService.duration),
      category: newService.category,
      description: newService.description || '', // Optional
    };

    setServices([...services, newServiceEntry]); // Add the new service to the list
    setNewService({ name: '', cost: '', subscriptionCost: '', duration: '', category: '', description: '' }); // Reset form
    toggleModal(); // Close the modal
  };

  const tabs = [
    {
      id: 'services-tab',
      content: 'Services',
      accessibilityLabel: 'Services',
      panelID: 'services-panel',
    },
    {
      id: 'bundles-tab',
      content: 'Bundles',
      accessibilityLabel: 'Bundles',
      panelID: 'bundles-panel',
    },
  ];

  const categoryOptions = categories.map((category) => ({ label: category, value: category }));

  const servicesMarkup = (
    <Layout.Section>
      <div style={{ marginBottom: '20px' }}>
        <Button primary onClick={toggleModal}>
          Add New Service
        </Button>
      </div>
      <DataTable
        columnContentTypes={['text', 'numeric', 'numeric', 'text', 'text']}
        headings={['Service Name', 'Cost', 'Subscription Cost', 'Duration', 'Category']}
        rows={services.map(service => [
          service.name,
          `${business.currency.symbol}${service.cost}`,  // Display cost with currency symbol
          service.subscriptionCost ? `${business.currency.symbol}${service.subscriptionCost}` : '-',  // Display subscription cost if available
          `${service.duration} mins`,
          service.category,
        ])}
      />
    </Layout.Section>
  );

  const bundlesMarkup = (
    <Layout.Section>
      <DataTable
        columnContentTypes={['text', 'numeric', 'numeric', 'text', 'text']}
        headings={['Bundle Name', 'Cost', 'Subscription Cost', 'Duration', 'Services']}
        rows={bundles.map(bundle => [
          bundle.name,
          `${business.currency.symbol}${bundle.cost}`,  // Display cost with currency symbol
          `${business.currency.symbol}${bundle.subscriptionCost}`,  // Display subscription cost
          `${bundle.duration} mins`,
          bundle.services.join(', '),  // List services included in the bundle
        ])}
      />
    </Layout.Section>
  );

  return (
    <Page title="Services & Bundles">
      <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
        <Layout>
          {selectedTab === 0 ? servicesMarkup : bundlesMarkup}
        </Layout>
      </Tabs>

      {/* Modal for adding a new service */}
      <Modal
        open={activeModal}
        onClose={toggleModal}
        title="Add a New Service"
        primaryAction={{
          content: 'Add Service',
          onAction: handleSubmit,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: toggleModal,
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Service Name"
              value={newService.name}
              onChange={handleInputChange('name')}
              autoComplete="off"
            />
            <TextField
              label="Cost"
              type="number"
              value={newService.cost}
              onChange={handleInputChange('cost')}
              autoComplete="off"
            />
            <TextField
              label="Subscription Cost (Optional)"
              type="number"
              value={newService.subscriptionCost}
              onChange={handleInputChange('subscriptionCost')}
              autoComplete="off"
            />
            <TextField
              label="Duration (in minutes)"
              type="number"
              value={newService.duration}
              onChange={handleInputChange('duration')}
              autoComplete="off"
            />
            <TextField
              label="Description (Optional)"
              value={newService.description}
              onChange={handleInputChange('description')}
              multiline={3}
              autoComplete="off"
            />

            <FormLayout.Group>
              <Select
                label="Category"
                options={categoryOptions}
                onChange={handleInputChange('category')}
                value={newService.category}
              />
              
                
              
              <ButtonGroup>
              
                <TextField
                  label="New Category"
                  value={newCategory}
                  onChange={(value) => setNewCategory(value)}
                  autoComplete="off"
                />
                <Button onClick={addCategory}>Add New Category</Button>
              
              </ButtonGroup>
            </FormLayout.Group>
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

export default ServicesScreen;
