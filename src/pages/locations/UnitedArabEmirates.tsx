import React from 'react';
import LocationPage from '@/components/locations/LocationPage';
import { locationContent } from '@/content/locations';
import { unitedArabEmirates } from '@/content/locations/unitedArabEmirates';

const UnitedArabEmirates = () => <LocationPage content={locationContent(unitedArabEmirates)} />;

export default UnitedArabEmirates;
