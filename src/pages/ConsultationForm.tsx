import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
const ConsultationForm = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <section className="min-h-screen bg-gray-50 py-10 px-6 md:px-20">
        <div className="bg-white shadow-md rounded-lg max-w-2xl mx-auto p-6">
          <h2 className="text-3xl font-bold text-center mb-6">
            Schedule Consultation
          </h2>
          <form className="space-y-6">
            <div>
              <label className="block mb-1 font-medium">Full Name</label>
              <input
                type="text"
                className="w-full p-3 border rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Email</label>
              <input
                type="email"
                className="w-full p-3 border rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Project Brief</label>
              <textarea
                className="w-full p-3 border rounded"
                rows="4"
                required
              ></textarea>
            </div>
            <button
              type="submit"
              className="bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white px-6 py-3 rounded font-semibold hover:bg-red-700"
            >
              Submit Request
            </button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ConsultationForm;
