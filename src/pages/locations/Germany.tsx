import React from 'react';
import LocationPage from '@/components/locations/LocationPage';
import { locationContent } from '@/content/locations';
import { germany } from '@/content/locations/germany';

const Germany = () => <LocationPage content={locationContent(germany)} />;

export default Germany;
