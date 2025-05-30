
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Users, Award, Target, Heart } from 'lucide-react';

const About = () => {
  const team = [
    {
      name: 'Rohan Sahu',
      role: 'CEO & Founder',
      image: 'https://media.licdn.com/dms/image/v2/D4D03AQGn0q3Se567FQ/profile-displayphoto-shrink_400_400/B4DZOS2oOVG0Ak-/0/1733335615462?e=1753920000&v=beta&t=bhcnaZKFFXbmCtT1gzhFWt-K0-UWfMc9aLb3qSk7MqU',
      bio: 'Tech entrepreneur with 9+ years of experience in software development and business strategy.'
    },
    {
      name: 'Aditi Gupta',
      role: 'CTO',
      image: 'https://media.licdn.com/dms/image/v2/D4D03AQGdohH6yqRFVA/profile-displayphoto-shrink_800_800/B4DZafsxOZGgAc-/0/1746436036845?e=1753920000&v=beta&t=PjU1yWFrL2Kxgvqe3lINg0GeEPkPxE96G8uuTfmn33g',
      bio: 'Expert in scalable architecture and emerging technologies with a passion for innovation.'
    },
    {
      name: 'Sachin Basaiye',
      role: 'Project Manager',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face',
      bio: 'Creative Project Manager focused on user-centered strategies and delivering exceptional digital experiences'
    },
    {
      name: 'Emily Johnson',
      role: 'VP of Marketing',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face',
      bio: 'Digital marketing strategist helping businesses grow their online presence and reach.'
    }
  ];

  const values = [
    {
      icon: Target,
      title: 'Innovation',
      description: 'We stay ahead of technology trends to deliver cutting-edge solutions.'
    },
    {
      icon: Users,
      title: 'Collaboration',
      description: 'We work closely with our clients as partners in their success.'
    },
    {
      icon: Award,
      title: 'Excellence',
      description: 'We maintain the highest standards in everything we do.'
    },
    {
      icon: Heart,
      title: 'Passion',
      description: 'We love what we do and it shows in our work quality.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 to-indigo-700 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">About Scs Softwares</h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            We're a passionate team of developers, designers, and digital strategists 
            committed to transforming businesses through innovative technology solutions.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-800 mb-6">Our Story</h2>
              <p className="text-gray-600 mb-6">
                Founded in 2018, Scs Softwares began as a small team of passionate developers 
                who believed technology could solve complex business challenges. Today, 
                we've grown into a leading software development company serving clients worldwide.
              </p>
              <p className="text-gray-600 mb-6">
                Our journey has been marked by continuous learning, innovation, and a 
                commitment to delivering exceptional results. We've helped over 500 businesses 
                transform their operations and achieve their digital goals.
              </p>
              <p className="text-gray-600">
                At Scs Softwares, we don't just write code – we craft solutions that make a 
                real difference in people's lives and businesses.
              </p>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop" 
                alt="Team collaboration"
                className="rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">Our Values</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              These core values guide everything we do and shape our company culture.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <value.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">Meet Our Team</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our diverse team of experts brings together years of experience 
              and a shared passion for excellence.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div key={index} className="text-center">
                <img 
                  src={member.image} 
                  alt={member.name}
                  className="w-32 h-32 rounded-full object-cover mx-auto mb-4"
                />
                <h3 className="text-xl font-bold text-gray-800 mb-1">{member.name}</h3>
                <p className="text-blue-600 font-medium mb-3">{member.role}</p>
                <p className="text-gray-600 text-sm">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
