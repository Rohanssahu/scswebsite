import { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const ApplicationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    position: "",
    contact: "",
    gender: "",
    cover_note: "",
    resume: null,
  });

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      setFormData({ ...formData, resume: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    const payload = new FormData();
    for (const key in formData) {
      payload.append(key, formData[key]);
    }
  
    try {
      const response = await fetch(
        "https://www.scssoftwares.com/scsapi/apply.php",
        {
          method: "POST",
          body: payload,
        }
      );
  
      const result = await response.json();
      alert(result.message);
  
      // Reset form on success
      setFormData({
        name: "",
        email: "",
        position: "",
        contact: "",
        gender: "",
        cover_note: "",
        resume: null,
      });
  
      // Optional: Reset file input manually
      document.getElementById("resumeInput").value = "";
    } catch (err) {
      console.error("Submission error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  

  return (
    <div>
      <Header />
      <section id="application-form" className="py-12 px-6 bg-white">
        <h2 className="text-3xl font-bold text-center mb-10">Apply Now</h2>
        <form
          className="max-w-5xl mx-auto space-y-6"
          onSubmit={handleSubmit}
          encType="multipart/form-data"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1 font-medium">
                Candidate Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
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
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-2 pr-10 rounded"
                  required
                />
                <span className="absolute right-3 top-2.5 text-gray-400">✉️</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1 font-medium">Position</label>
              <select
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded"
              >
                <option value="">Select Position</option>
                <option>Dot Net Indore - T088</option>
                <option>React Developer - Remote</option>
                <option>UI/UX Designer - Pune</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Contact</label>
              <input
                type="tel"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1 font-medium">Upload Resume</label>
              <input
  type="file"
  name="resume"
  id="resumeInput"
  onChange={handleChange}
  className="w-full border border-gray-300 p-2 rounded"
  accept=".pdf,.doc,.docx"
  required
/>

            </div>
            <div>
              <label className="block mb-1 font-medium">
                Gender <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="gender"
                    value="Male"
                    checked={formData.gender === "Male"}
                    onChange={handleChange}
                  />{" "}
                  Male
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="gender"
                    value="Female"
                    checked={formData.gender === "Female"}
                    onChange={handleChange}
                  />{" "}
                  Female
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block mb-1 font-medium">Cover Note</label>
            <textarea
              name="cover_note"
              value={formData.cover_note}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              rows="4"
            ></textarea>
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="policy" required />
            <label htmlFor="policy" className="text-sm">
              I agree to the privacy policy and give consent to be contacted.
            </label>
          </div>

          <div className="flex gap-4">
          <button
  type="submit"
  disabled={isSubmitting}
  className={`px-6 py-2 rounded text-white ${
    isSubmitting ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
  }`}
>
  {isSubmitting ? "Submitting..." : "Submit"}
</button>

            <button
              type="reset"
              className="border border-gray-400 text-gray-700 px-6 py-2 rounded hover:bg-gray-100"
              onClick={() =>
                setFormData({
                  name: "",
                  email: "",
                  position: "",
                  contact: "",
                  gender: "",
                  cover_note: "",
                  resume: null,
                })
              }
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
