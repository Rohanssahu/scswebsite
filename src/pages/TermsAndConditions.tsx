import React from "react";
import { useTranslation } from "react-i18next";
import { icon } from '@/asset/images';
import Header from '../components/Header';
import Footer from '../components/Footer';
const TermsAndConditions = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white">
      <Header />
    <div className="min-h-screen bg-gray-50 py-10 px-6 md:px-20">
      <div className="flex items-center mb-8">
        <img src={icon.logos} alt="App Icon" className="w-10 h-10 mr-3" />
        <h1 className="text-3xl font-bold">{t('legal.terms.title')}</h1>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
        <p>
          {t('legal.terms.intro')}
        </p>

        <h2 className="text-xl font-semibold">{t('legal.terms.userTitle')}</h2>
        <p>
          {t('legal.terms.userText')}
        </p>

        <h2 className="text-xl font-semibold">{t('legal.terms.terminationTitle')}</h2>
        <p>
          {t('legal.terms.terminationText')}
        </p>

        <h2 className="text-xl font-semibold">{t('legal.terms.liabilityTitle')}</h2>
        <p>
          {t('legal.terms.liabilityText')}
        </p>

        <h2 className="text-xl font-semibold">{t('legal.terms.changesTitle')}</h2>
        <p>
          {t('legal.terms.changesText')}
        </p>

        <h2 className="text-xl font-semibold">{t('legal.terms.contactTitle')}</h2>
        <p>
          {t('legal.terms.contactText')} <a className="text-blue-600" href="mailto:support@scssoftwares.com">support@scssoftwares.com</a>.
        </p>
      </div>
    </div>
    <Footer />
    </div>
  );
};

export default TermsAndConditions;
