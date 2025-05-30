import Header from "../components/Header";
import Footer from "../components/Footer";
const ApplicationForm = () => {
  return (
    <div>
      <Header />

      <section id="application-form" className="py-12 px-6 bg-white">
        <h2 className="text-3xl font-bold text-center mb-10">Apply Now</h2>
        <form className="max-w-5xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1 font-medium">
                Candidate Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 p-2 rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">
                Email ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  className="w-full border border-gray-300 p-2 pr-10 rounded"
                  required
                />
                <span className="absolute right-3 top-2.5 text-gray-400">
                  ✉️
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1 font-medium">Position</label>
              <select className="w-full border border-gray-300 p-2 rounded">
                <option>Dot Net Indore - T088</option>
                <option>React Developer - Remote</option>
                <option>UI/UX Designer - Pune</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Contact</label>
              <input
                type="tel"
                className="w-full border border-gray-300 p-2 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1 font-medium">Upload Resume</label>
              <input
                type="file"
                className="w-full border border-gray-300 p-2 rounded"
                accept=".pdf,.doc,.docx"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">
                Gender <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input type="radio" name="gender" value="male" /> Male
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="gender" value="female" /> Female
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="uploaded" />
            <label htmlFor="uploaded" className="text-sm font-medium">
              uploaded
            </label>
          </div>

          <div>
            <label className="block mb-1 font-medium">Cover Note</label>
            <textarea
              className="w-full border border-gray-300 p-2 rounded"
              rows="4"
            ></textarea>
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="policy" />
            <label htmlFor="policy" className="text-sm">
              By submitting the form, I agree to the privacy policy and give my
              consent to receive emails/phone.
            </label>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Submit
            </button>
            <button
              type="reset"
              className="border border-gray-400 text-gray-700 px-6 py-2 rounded hover:bg-gray-100"
            >
              Reset
            </button>
          </div>
        </form>
      </section>
      <Footer />
    </div>
  );
};

export default ApplicationForm;
