import React from 'react';
import LocationPage from '@/components/locations/LocationPage';
import { locationContent } from '@/content/locations';
import { unitedKingdom } from '@/content/locations/unitedKingdom';

const UnitedKingdom = () => <LocationPage content={locationContent(unitedKingdom)} />;

export default UnitedKingdom;
