import React from "react";
import { useTranslation } from "react-i18next";
import { icon } from '@/asset/images';
import Header from '../components/Header';
import Footer from '../components/Footer';
const PrivacyPolicy = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main id="main-content">
    <div className="min-h-screen bg-gray-50 py-10 px-6 md:px-20">

      <div className="flex items-center mb-8">
        <img src={icon.logos} alt="SCS Softwares logo" width={40} height={40} decoding="async" className="w-10 h-10 mr-3" />
        <h1 className="text-3xl font-bold">{t('legal.privacy.title')}</h1>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
        <p>
          {t('legal.privacy.intro')}
        </p>

        <h2 className="text-xl font-semibold">{t('legal.privacy.collectTitle')}</h2>
        <p>
          {t('legal.privacy.collectText')}
        </p>

        <h2 className="text-xl font-semibold">{t('legal.privacy.useTitle')}</h2>
        <p>
          {t('legal.privacy.useText')}
        </p>

        <h2 className="text-xl font-semibold">{t('legal.privacy.securityTitle')}</h2>
        <p>
          {t('legal.privacy.securityText')}
        </p>

        <h2 className="text-xl font-semibold">{t('legal.privacy.contactTitle')}</h2>
        <p>
          {t('legal.privacy.contactText')} <a className="text-blue-600" href="mailto:support@scssoftwares.com">support@scssoftwares.com</a>.
        </p>
      </div>
    </div>
      </main>

    <Footer />
    </div>
  );
};

export default PrivacyPolicy;
