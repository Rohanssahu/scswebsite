import React from "react";
import { icon } from '@/asset/images';
import Header from '../components/Header';
import Footer from '../components/Footer';
const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
    <div className="min-h-screen bg-gray-50 py-10 px-6 md:px-20">
      <div className="flex items-center mb-8">
        <img src={icon.logos} alt="App Icon" className="w-10 h-10 mr-3" />
        <h1 className="text-3xl font-bold">Terms & Conditions</h1>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
        <p>
          These Terms and Conditions govern your use of our app and services. By using our app, you agree to these terms.
        </p>

        <h2 className="text-xl font-semibold">User Responsibilities</h2>
        <p>
          Users must not misuse the app in any unlawful or harmful manner. Violation may result in termination of services.
        </p>

        <h2 className="text-xl font-semibold">Account Termination</h2>
        <p>
          We reserve the right to suspend or terminate accounts that breach our policies without prior notice.
        </p>

        <h2 className="text-xl font-semibold">Limitation of Liability</h2>
        <p>
          We are not liable for any indirect damages arising from the use or inability to use the service.
        </p>

        <h2 className="text-xl font-semibold">Changes to Terms</h2>
        <p>
          We may update these terms at any time. Continued use after updates constitutes agreement to the revised terms.
        </p>

        <h2 className="text-xl font-semibold">Contact</h2>
        <p>
          For questions, email us at <a className="text-blue-600" href="mailto:support@scssoftwares.com">support@scssoftwares.com</a>.
        </p>
      </div>
    </div>
    <Footer />
    </div>
  );
};

export default TermsAndConditions;
