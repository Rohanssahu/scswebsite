import { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import emailjs from "emailjs-com";
const ApplicationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    position: "",
    contact: "",
    gender: "",
    cover_note: "",
    resume1: null,
   
  });

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (type === "file") {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  const [dialog, setDialog] = useState({
    open: false,
    type: "", // success | error
    message: ""
  });
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
    let resume1Url = "";
  

    if (formData.resume1) {
      resume1Url = await uploadFile(formData.resume1);
    }

 console.log("Resume URL:", resume1Url);
    await emailjs.send(
      "service_fz97kyb",
      "template_shbutfo",
      {
        name: formData.name,
        email: formData.email,
        position: formData.position,
        contact: formData.contact,
        gender: formData.gender,
        cover_note: formData.cover_note,
        resume1: resume1Url,
       
      },
      "np--atCig3crdyD1t"
    );

    setDialog({
      open: true,
      type: "success",
      message: `Thank you ${formData.name}! Your application has been submitted successfully. Our team will contact you within 24-48 hours.`,
    });

    setFormData({
      name: "",
      email: "",
      position: "",
      contact: "",
      gender: "",
      cover_note: "",
      resume1: null,
 
    });

  } catch (error) {
    console.error(error);
    setDialog({
      open: true,
      type: "error",
      message: "Failed to submit application. Try again.",
    });
  } finally {
    setIsSubmitting(false);
  }
};

const uploadFile = async (file) => {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", "resume_upload");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dwrkulmwh/auto/upload",
    {
      method: "POST",
      body: data,
    }
  );

  const result = await res.json();
  console.log("Cloudinary response:", result); // 🔥 debug

  return result.secure_url;
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
             
              <div>
                <label className="block mb-1 font-medium">Upload Resume*</label>
                <input
                  type="file"
                  name="resume1"
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-2 rounded"
                  accept=".pdf,.doc,.docx"
                  required
                />
              </div>

       

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
              className={`px-6 py-2 rounded text-white ${isSubmitting ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
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
      {dialog.open && (
        <div className="fixed inset-0 flex items-center justify-center z-50">

          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDialog({ ...dialog, open: false })}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-[90%] max-w-md text-center animate-fadeIn">

            {/* Icon */}
            <div className={`mx-auto w-14 h-14 flex items-center justify-center rounded-full mb-4 
        ${dialog.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>

              {dialog.type === 'success' ? (
                <span className="text-green-600 text-2xl">✔</span>
              ) : (
                <span className="text-red-600 text-2xl">✖</span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {dialog.type === 'success' ? 'Application Submitted 🎉' : 'Error'}
            </h3>

            {/* Message */}
            <p className="text-gray-600 mb-6">
              {dialog.message}
            </p>

            {/* Button */}
            <button
              onClick={() => setDialog({ ...dialog, open: false })}
              className="px-6 py-2 rounded-lg text-white font-medium 
        bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:opacity-90"
            >
              OK
            </button>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default ApplicationForm;
