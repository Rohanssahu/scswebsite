import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ProductDetailsPage = () => {
  const images = [
    'https://www.scssoftwares.com/images/roomji1.png',
    'https://www.scssoftwares.com/images/roomji2.png',
    'https://www.scssoftwares.com/images/roomji3.png',
    'https://www.scssoftwares.com/images/roomji4.png',
    'https://www.scssoftwares.com/images/roomji5.png',
  ];

  const product = {
    title: 'RoomJi',
    subtitle: 'Find & Book Rooms and Flats Online',
    description:
      'Search nearby rooms, flats, and all types of properties, with easy online booking and image galleries.',
    location: 'Indore MP, India',
    features: [
      'Instant booking confirmation',
      'High-quality images with virtual tours',
      '24/7 customer support',
      'Flexible cancellation policies',
    ],
    path: '/product/roomji',
  };

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
  {/* Product Info */}
  <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
  <h1 className="text-2xl sm:text-3xl font-semibold text-blue-600 mb-4">
    {product.title}
  </h1>
  <h2 className="text-lg sm:text-xl font-medium mb-5 text-gray-800">
    {product.subtitle}
  </h2>
  <p className="text-gray-600 mb-6 text-sm sm:text-base leading-relaxed">
    {product.description}
  </p>

  <div className="mb-6">
    <h3 className="text-lg sm:text-xl font-semibold mb-1">Location</h3>
    <p className="text-gray-600 text-sm sm:text-base">{product.location}</p>
  </div>

  <div className="mb-8">
    <h3 className="text-lg sm:text-xl font-semibold mb-2">Features</h3>
    <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm sm:text-base">
      {product.features.map((feature, idx) => (
        <li key={idx}>{feature}</li>
      ))}
    </ul>
  </div>

  <button className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-md hover:bg-blue-700 transition text-sm sm:text-base">
    Book Now
  </button>
</div>
      {/* Image Carousel */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {images.map((img, i) => (
      <div key={i} className="w-full h-48 sm:h-56 md:h-64 overflow-hidden rounded-lg shadow">
        <img
          src={img}
          alt={`${product.title} ${i + 1}`}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
    ))}
  </div>
</div>

    

      <Footer />
    </div>
  );
};

export default ProductDetailsPage;
