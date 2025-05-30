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
  
  // Add more blog posts if needed
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
