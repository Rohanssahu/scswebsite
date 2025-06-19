import React from 'react';
import './BlogPage.css';
import Header from '../components/Header';
import Footer from '../components/Footer';

const blogPosts = [
  {
    title: "How AI is Shaping the Metaverse: Unlocking New Opportunities",
    image: "https://cdn.prod.website-files.com/6320125ace536b6ad148eca3/682ad06a74f17c58e6ba13a2_Metaverse%20avatar%20collage%20concept-p-800.webp",
    tag: "Artificial Intelligence",
  },
  {
    title: "Smart Project Management with AI Agents: Capabilities, Tools, and Reality Check",
    image: "https://sixtysixten.com/wp-content/uploads/2024/12/ai-agent-for-project-management-1024x585.jpg",
    tag: "Artificial Intelligence",
  },
  {
    title: "From Smart to Sensitive: The Evolution of Emotional AI Agents",
    image: "https://aigptjournal.com/wp-content/uploads/2024/04/DALL%C2%B7E-2024-04-09-18.42.19-Two-side-by-side-images-in-a-3-to-2-ratio.-On-the-left-an-image-of-a-human-face-expressing-a-clear-emotion-such-as-happiness-or-surprise.-On-the-righ-1536x878.webp",
    tag: "Artificial Intelligence",
  },
  {
    title: "AI in Healthcare: Predicting Diseases Before Symptoms Appear",
    image: "https://www.scssoftwares.com/images/AIinHealthcare.jpeg",
    tag: "Healthcare AI",
  },
  {
    title: "AI-Powered Chatbots: Transforming Customer Support Forever",
    image: "https://www.scssoftwares.com/images/AIPoweredChatbots.jpeg",
    tag: "Customer Support",
  },
  {
    title: "Revolutionizing Education with Personalized AI Tutors",
    image: "https://www.scssoftwares.com/images/AITutors.jpeg",
    tag: "Education",
  },
  {
    title: "How AI Detects Fake News: Tools and Techniques Explained",
    image: "https://www.scssoftwares.com/images/DetectsFakeNews.jpeg",
    tag: "AI Ethics",
  },
  {
    title: "Using AI to Analyze Emotions in Video Calls",
    image: "https://www.scssoftwares.com/images/VideoCalls.jpeg",
    tag: "Communication",
  },
  {
    title: "AI in Finance: From Fraud Detection to Smart Investments",
    image: "https://www.scssoftwares.com/images/AIFinance.jpeg",
    tag: "Finance",
  },
  {
    title: "How Developers are Leveraging AI in Web Development",
    image: "https://www.scssoftwares.com/images/WebDevelopment.jpeg",
    tag: "Development",
  },
  {
    title: "Ethical Dilemmas in Generative AI: What Creators Need to Know",
    image: "https://cdn.analyticsvidhya.com/wp-content/uploads/2023/07/Gen-AI-Article.png",
    tag: "Ethics",
  },
  {
    title: "Voice AI: The Future of Human-Machine Interaction",
    image: "https://www.speechmatics.com/wp-content/uploads/2022/07/Voice-AI.png",
    tag: "Voice AI",
  },
  {
    title: "IoT in Automobiles: The Rise of Connected Cars",
    image: "https://iot.electronicsforu.com/wp-content/uploads/2021/01/Connected-car.jpg",
    tag: "IoT / Automobile",
  },
  {
    title: "How IoT is Revolutionizing Smart Homes",
    image: "https://www.link-labs.com/hubfs/smart-home-iot-devices.jpg",
    tag: "IoT / Smart Home",
  },
  {
    title: "IoT-Based Wearables: Health Monitoring in Real-Time",
    image: "https://iotbusinessnews.com/wp-content/uploads/2022/01/iot-wearable-devices.jpg",
    tag: "IoT / Wearables",
  },
  {
    title: "Industrial IoT (IIoT): Smart Factories of the Future",
    image: "https://www.analyticsinsight.net/wp-content/uploads/2021/08/Industrial-IoT-1.jpg",
    tag: "IoT / Industrial",
  },
  {
    title: "Smart Agriculture with IoT Sensors and Automation",
    image: "https://www.researchsnipers.com/wp-content/uploads/2022/03/smart-agriculture.jpg",
    tag: "IoT / Agriculture",
  },
  {
    title: "Smart Cities: Building Urban Intelligence with IoT",
    image: "https://stl.tech/wp-content/uploads/2022/02/Smart-City-Technology.jpg",
    tag: "IoT / Smart Cities",
  },
  {
    title: "IoT in Retail: Enhancing Customer Experience and Logistics",
    image: "https://www.iotforall.com/wp-content/uploads/2021/02/IoT-in-Retail.png",
    tag: "IoT / Retail",
  },
  {
    title: "Fleet Management Using IoT Telematics",
    image: "https://telematicswire.net/wp-content/uploads/2020/07/fleet.jpg",
    tag: "IoT / Automotive",
  },
  {
    title: "IoT in Smart Grid and Energy Monitoring Systems",
    image: "https://www.scnsoft.com/blog-pictures/iot/iot-energy-management-system.png",
    tag: "IoT / Energy",
  },
  {
    title: "IoT in Electronic Devices: From Lights to Appliances",
    image: "https://www.investopedia.com/thmb/lNn8MJghbgEPxNUf7sjyaEp8FjQ=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/what-is-internet-of-things-IOT-5194356-FINAL-23710ad5efc142e6a187c3b94ae699ff.png",
    tag: "IoT / Consumer Electronics",
  },
  {
    title: "IoT in Automotive Safety: Accident Prevention & Tracking",
    image: "https://media.istockphoto.com/id/1032276718/photo/modern-car-digital-infotainment-system.jpg?s=612x612&w=0&k=20&c=rvo23xBrxuGPRRCgxMiLG67m5Kn6A7TF-6SNTF6XpAo=",
    tag: "IoT / Automotive",
  },
];


const BlogCard = ({ title, image, tag, link }) => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform transform hover:scale-105">
    <img src={image} alt={title} className="w-full h-48 object-cover" />
    <div className="p-4">
      <div className="text-sm text-purple-600 font-semibold mb-2">{tag}</div>
      <h4 className="text-lg font-bold text-gray-800 mb-2">{title}</h4>
      <a href={link} className="text-blue-500 hover:underline">Read full story →</a>
    </div>
  </div>
);

const BlogPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <header className="bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white text-center py-16 px-4 mb-10">
  <h1 className="text-3xl md:text-4xl font-bold mb-4">
    How AI is Shaping the Metaverse: Unlocking New Opportunities
  </h1>
  <p className="max-w-2xl mx-auto text-lg">
    Learn how AI powers avatars, shopping, learning, healthcare, and more in the metaverse—with real examples and practical benefits for businesses.
  </p>
</header>

<section className="max-w-6xl mx-auto px-4 pt-4 pb-10">
  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
    {blogPosts.map((post, index) => (
      <BlogCard key={index} {...post} />
    ))}
  </div>

  <div className="flex justify-center mt-10">
    <button
      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
      onClick={() => window.location.href = '/blogs'}
    >
      View All Blogs
    </button>
  </div>
</section>


      <Footer />
    </div>
  );
};

export default BlogPage;
