import React from "react";
import { icon } from '@/asset/images';
import Header from '../components/Header';
import Footer from '../components/Footer';
const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
  
    <div className="min-h-screen bg-gray-50 py-10 px-6 md:px-20">

      <div className="flex items-center mb-8">
        <img src={icon.logos} alt="App Icon" className="w-10 h-10 mr-3" />
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
        <p>
          This Privacy Policy describes how we collect, use, and protect your personal information when you use our app or website.
        </p>

        <h2 className="text-xl font-semibold">Information We Collect</h2>
        <p>
          We may collect personal details like your name, email, phone number, and usage data to improve user experience.
        </p>

        <h2 className="text-xl font-semibold">How We Use Information</h2>
        <p>
          We use the data to enhance services, provide customer support, and ensure security. Your data is never sold to third parties.
        </p>

        <h2 className="text-xl font-semibold">Data Security</h2>
        <p>
          We use industry-standard encryption and secure servers to protect your information.
        </p>

        <h2 className="text-xl font-semibold">Contact Us</h2>
        <p>
          If you have any questions, please contact us at <a className="text-blue-600" href="mailto:support@scssoftwares.com">support@scssoftwares.com</a>.
        </p>
      </div>
    </div>
    <Footer />
    </div>
  );
};

export default PrivacyPolicy;
