import React from 'react';
import LocationPage from '@/components/locations/LocationPage';
import { locationContent } from '@/content/locations';
import { australia } from '@/content/locations/australia';

const Australia = () => <LocationPage content={locationContent(australia)} />;

export default Australia;
