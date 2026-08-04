import Hero from '../components/Hero';
import About from '../components/About';
import Experience from '../components/Experience';
import Projects from '../components/Projects';
import BlogSection from '../components/BlogSection';
import Navbar from '../components/Navbar';
import Contact from '../components/Contact';
import { useDeferredSections } from '../hooks/useDeferredSections';

export default function Home() {
  useDeferredSections();

  return (
    <>
      <Navbar />
      <div className="w-full relative z-10 mx-auto max-w-[1400px]">
        <Hero />
        <About />
        <Experience />
        <Projects />
        <BlogSection />
        <Contact />
      </div>
    </>
  );
}
