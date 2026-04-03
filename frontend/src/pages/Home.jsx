import Hero from '../components/Hero';
import About from '../components/About';
import Experience from '../components/Experience';
import Projects from '../components/Projects';
import BlogSection from '../components/BlogSection';
import Album from '../components/Album';
import Navbar from '../components/Navbar';
import Contact from '../components/Contact';

export default function Home() {
  return (
    <>
      <Navbar />
      <div className="w-full relative z-10 mx-auto max-w-[1400px]">
        <Hero />
        <About />
        <Experience />
        <Projects />
        <Album />
        <BlogSection />
        <Contact />
      </div>
    </>
  );
}
