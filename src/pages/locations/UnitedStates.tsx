import React from 'react';
import LocationPage from '@/components/locations/LocationPage';
import { locationContent } from '@/content/locations';
import { unitedStates } from '@/content/locations/unitedStates';

const UnitedStates = () => <LocationPage content={locationContent(unitedStates)} />;

export default UnitedStates;
