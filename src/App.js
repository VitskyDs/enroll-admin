import React from 'react';
import { Frame, TopBar, Navigation, Layout, Page } from '@shopify/polaris';
import {
  HomeIcon,
  PackageIcon,
  HeartIcon,
  PersonIcon,
  TeamIcon,
  CalendarIcon,
  CashDollarIcon,
} from '@shopify/polaris-icons'; // Importing icons from Polarisimport { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import business from './business'; // Import business entity
import ServicesScreen from './ServicesScreen'; // Import Services Screen
import LoyaltyScreen from './LoyaltyScreen'; // Import Loyalty Screen
import CustomersScreen from './CustomersScreen'; // Import Customers Screen
import EmployeesScreen from './EmployeesScreen'; // Import Employees Screen
import ScheduleScreen from './ScheduleScreen'; // Import Schedule Screen
import GetPaidScreen from './GetPaidScreen'; // Import Get Paid Screen

function App() {
  const location = useLocation(); // Tracks the current route

  const topBarMarkup = <TopBar />;

  // Function to check if the current path matches the item's URL
  const isSelected = (url) => location.pathname === url;

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          { label: 'Home', icon: HomeIcon, url: '/', selected: isSelected('/') },
          { label: 'Services & Bundles', icon: PackageIcon, url: '/services-bundles', selected: isSelected('/services-bundles') },
          { label: 'Loyalty', icon: HeartIcon, url: '/loyalty', selected: isSelected('/loyalty') },
          { label: 'Customers', icon: PersonIcon, url: '/customers', selected: isSelected('/customers') },
          { label: 'Employees', icon: TeamIcon, url: '/employees', selected: isSelected('/employees') },
          { label: 'Schedule', icon: CalendarIcon, url: '/schedule', selected: isSelected('/schedule') },
          { label: 'Get Paid', icon: CashDollarIcon, url: '/get-paid', selected: isSelected('/get-paid') },
        ]}
      />
    </Navigation>
  );

  const homeMarkup = (
    <Page title="Home">
      <Layout>
        <Layout.Section>
          <p>Welcome to the home page for {business.name}.</p>
        </Layout.Section>
      </Layout>
    </Page>
  );

  return (
    <Frame topBar={topBarMarkup} navigation={navigationMarkup}>
      <Routes>
        <Route path="/" element={homeMarkup} />
        <Route path="/services-bundles" element={<ServicesScreen />} />
        <Route path="/loyalty" element={<LoyaltyScreen />} />
        <Route path="/customers" element={<CustomersScreen />} />
        <Route path="/employees" element={<EmployeesScreen />} />
        <Route path="/schedule" element={<ScheduleScreen />} />
        <Route path="/get-paid" element={<GetPaidScreen />} />
      </Routes>
    </Frame>
  );
}

export default function WrappedApp() {
  return (
    <Router>
      <App />
    </Router>
  );
}
