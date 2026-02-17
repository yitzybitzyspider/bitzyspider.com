import React from 'react';
import { SpiderCursor } from './components/SpiderCursor';
import { SPIDER_ENABLED } from './config';
import { motion } from 'motion/react';
import {
  Globe, ArrowRight, Download, Users, Camera, Waves, Activity,
  Briefcase, Droplet, Wrench, Mail
} from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-500/30 font-sans overflow-x-hidden relative">
      <div className="relative z-0">
        <div
          className="fixed inset-0 z-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1581985449868-ad30e0d0c321?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/50 via-black/80 to-black pointer-events-none" />
        <main className="relative z-10">
          <Navbar />
          <Hero />
          <Bio />
          <Work />
          <Community />
          <Hobbies />
          <Contact />
          <Footer />
        </main>
      </div>
      {SPIDER_ENABLED && <SpiderCursor />}
    </div>
  );
}

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-30 p-6 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent backdrop-blur-sm">
    <div className="text-2xl font-bold tracking-tighter flex items-center gap-2">
      <Globe className="text-red-500" />
      <span>BITZYSPIDER<span className="text-red-500">.COM</span></span>
    </div>
    <div className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
      <NavItem href="#about">About</NavItem>
      <NavItem href="#work">Work</NavItem>
      <NavItem href="#community">Community</NavItem>
      <NavItem href="#gallery">Gallery</NavItem>
    </div>
    <a href="#contact" className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-red-500 hover:text-white transition-colors duration-300">
      Say Hello
    </a>
  </nav>
);

const NavItem = ({ children, href }: { children: React.ReactNode; href: string }) => (
  <a href={href} className="hover:text-white transition-colors cursor-none">{children}</a>
);

const Hero = () => (
  <section className="min-h-screen flex flex-col justify-center items-center text-center px-4 pt-20">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="max-w-5xl"
    >
      <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-tight">
        YITZY ROSENBERG: <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800">I UNTANGLE</span> <br />
        WICKED PROBLEMS.
      </h1>
      <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-4 leading-relaxed font-light">
        Systems Engineer. 2x Founder. Growth Strategist. <br className="hidden md:block" />
        From water infrastructure for 10M people to optimizing startup operations.
      </p>
      <p className="text-sm text-gray-500 font-mono mb-10">
        (You catch the bug on the screen. I catch the bugs in the system.)
      </p>
      <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
        <motion.a
          href="#work"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-red-600 text-white px-8 py-4 rounded-lg font-bold text-lg flex items-center gap-2 group border border-red-500 hover:bg-red-700 transition-all cursor-none"
        >
          Explore My Work <ArrowRight className="group-hover:translate-x-1 transition-transform" />
        </motion.a>
        <motion.a
          href="#"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-transparent border border-gray-700 text-white px-8 py-4 rounded-lg font-bold text-lg hover:border-white transition-colors cursor-none flex items-center gap-2"
        >
          <Download size={20} /> Download the CV
        </motion.a>
      </div>
    </motion.div>
  </section>
);

const Bio = () => (
  <section id="about" className="py-32 px-4 bg-zinc-900/30">
    <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-start">
      <div className="relative sticky top-32">
        <img
          src="https://images.unsplash.com/photo-1506478260391-8dc8e747cdd1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
          alt="Coding Workspace"
          className="relative rounded-2xl border border-zinc-700 shadow-2xl grayscale hover:grayscale-0 transition-all duration-700 w-full"
        />
        <div className="mt-8 border-l-2 border-red-500 pl-6 py-2">
          <p className="text-xl font-bold italic text-white">
            "I learned systems engineering before I knew what it was called."
          </p>
        </div>
      </div>
      <div>
        <h2 className="text-4xl md:text-5xl font-bold mb-8 flex items-center gap-3">The Non-Linear Path</h2>
        <div className="space-y-8 text-gray-300 text-lg leading-relaxed">
          <p>I don't fit in boxes. I usually break them to see how they're made.</p>
          <p>
            My education didn't happen in a typical classroom. I left an insular community at 15 to find my own way, teaching myself high school on public library Wi-Fi. That path led me from a GED to a full Ivy League scholarship at Cornell University.
          </p>
          <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
            <h3 className="text-xl font-bold text-white mb-4">Why does this matter to you?</h3>
            <p>Because I don't panic when the blueprint is missing.</p>
          </div>
          <p>
            Spiders are the original systems engineers—they build complex, resilient structures out of nothing. That is how I approach my work.
          </p>
          <ul className="list-none space-y-2 font-mono text-red-400">
            <li className="flex items-center gap-2"><ArrowRight size={16} /> Assess the resources</li>
            <li className="flex items-center gap-2"><ArrowRight size={16} /> Hack the system</li>
            <li className="flex items-center gap-2"><ArrowRight size={16} /> Build a path where there wasn't one</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
);

const Work = () => (
  <section id="work" className="py-32 px-4">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-20">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">How I Spend My Energy</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">Solving problems across industries.</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-12 mb-20">
        <div className="bg-zinc-900/20 border border-zinc-800 p-8 rounded-2xl hover:border-red-500/30 transition-colors">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-red-500/10 p-4 rounded-full text-red-500"><Briefcase size={32} /></div>
            <div>
              <h3 className="text-3xl font-bold">The Operator</h3>
              <p className="text-gray-400 text-sm uppercase tracking-widest">Real Estate & Startups</p>
            </div>
          </div>
          <p className="text-xl text-white mb-8 italic border-l-4 border-red-500 pl-4">Fixing the engine while the plane is flying.</p>
          <WorkItem title="The Turnaround" company="Woolbright Development" desc="Built the system that made leasing inevitable. Created AI workflows, leased 14 vacancies in six months, $14M value." />
          <WorkItem title="The Scale-Up" company="Gearsupply" desc="Director of Ops, built operations from scratch, revenue to $15M+." />
        </div>
        <div className="bg-zinc-900/20 border border-zinc-800 p-8 rounded-2xl hover:border-blue-500/30 transition-colors">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-blue-500/10 p-4 rounded-full text-blue-500"><Droplet size={32} /></div>
            <div>
              <h3 className="text-3xl font-bold">The Engineer</h3>
              <p className="text-gray-400 text-sm uppercase tracking-widest">Water & Infrastructure</p>
            </div>
          </div>
          <p className="text-xl text-white mb-8 italic border-l-4 border-blue-500 pl-4">Solving for the next 100 years.</p>
          <WorkItem title="The Big Swing" company="South Florida Water Mgmt" desc="Managed resiliency for 10M+ constituents." />
          <WorkItem title="The Stakes" company="Budgeting & Risk" desc="Oversaw $350M+ in infrastructure projects." />
        </div>
      </div>
      <div className="bg-zinc-900/40 rounded-2xl p-10 border border-zinc-800">
        <h3 className="text-2xl font-bold mb-8 flex items-center gap-3"><Wrench className="text-gray-400" /> The Toolkit</h3>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-red-500 font-mono text-sm mb-4 uppercase tracking-widest">Languages</h4>
            <div className="flex flex-wrap gap-3">
              <TechBadge name="Python" /><TechBadge name="R" /><TechBadge name="SQL" /><TechBadge name="Diplomacy with Traditionalists" highlight />
            </div>
          </div>
          <div>
            <h4 className="text-red-500 font-mono text-sm mb-4 uppercase tracking-widest">Superpowers</h4>
            <div className="flex flex-wrap gap-3">
              <TechBadge name="MonteCarlo Simulations" /><TechBadge name="LBO Modeling" /><TechBadge name="Pressure Management" highlight />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const WorkItem = ({ title, company, desc }: { title: string; company: string; desc: string }) => (
  <div>
    <h4 className="text-lg font-bold text-white flex items-center gap-2">{title} <span className="text-gray-500 text-sm font-normal">| {company}</span></h4>
    <p className="text-gray-400 mt-2 leading-relaxed text-sm">{desc}</p>
  </div>
);

const TechBadge = ({ name, highlight = false }: { name: string; highlight?: boolean }) => (
  <span className={`px-4 py-2 rounded-full text-sm font-mono border ${highlight ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-zinc-800 border-zinc-700 text-gray-300'}`}>{name}</span>
);

const Community = () => (
  <section id="community" className="py-32 px-4 bg-gradient-to-b from-zinc-900/20 to-black">
    <div className="max-w-4xl mx-auto text-center">
      <div className="inline-block p-4 rounded-full bg-zinc-800/50 mb-6"><Users size={32} className="text-white" /></div>
      <h2 className="text-4xl md:text-6xl font-bold mb-8">The Math of Community</h2>
      <p className="text-2xl font-light text-white mb-10">"I believe the best systems are <span className="text-red-500 font-bold">human</span> ones."</p>
      <div className="bg-zinc-900/30 p-8 md:p-12 rounded-2xl border border-zinc-800 backdrop-blur-sm text-left md:text-center">
        <p className="text-gray-300 text-lg leading-relaxed mb-6">Over the last few years, I've hosted nearly 100 "Friday Night Dinners." The only rule? <strong className="text-white">Bring someone who thinks differently than you do.</strong></p>
        <p className="text-gray-300 text-lg leading-relaxed">I'm a connector. I bridge gaps between investors and engineers, between policy and practice.</p>
      </div>
    </div>
  </section>
);

const Hobbies = () => (
  <section id="gallery" className="py-32 px-4">
    <div className="max-w-7xl mx-auto">
      <h2 className="text-4xl md:text-5xl font-bold mb-4">Off The Clock</h2>
      <p className="text-gray-400 mb-16">Renaissance Man in training.</p>
      <div className="grid md:grid-cols-3 gap-8">
        <PhotoCard image="https://images.unsplash.com/photo-1698546074216-8d1cc5cfcc94?q=80&w=1080" icon={<Waves size={24} />} title="The Deep Dive" subtitle="Advanced Scuba Diver" desc="I'm comfortable under pressure (literally)." />
        <PhotoCard image="https://images.unsplash.com/photo-1681169252035-a7f529472f23?q=80&w=1080" icon={<Activity size={24} />} title="Perspective Shift" subtitle="The Handstand" desc="Sometimes the problem isn't the problem. The problem is the angle." />
        <PhotoCard image="https://images.unsplash.com/photo-1761701390270-e99630731383?q=80&w=1080" icon={<Camera size={24} />} title="Analog Soul" subtitle="Film Photography" desc="In a world of instant digital gratification, I shoot film." />
      </div>
    </div>
  </section>
);

const PhotoCard = ({ image, icon, title, subtitle, desc }: { image: string; icon: React.ReactNode; title: string; subtitle: string; desc: string }) => (
  <motion.div whileHover={{ y: -10 }} className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all h-full flex flex-col">
    <div className="h-64 overflow-hidden relative">
      <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
      <div className="absolute bottom-4 left-4 z-20 bg-black/60 backdrop-blur-md p-2 rounded-lg text-white">{icon}</div>
    </div>
    <div className="p-8 flex-1 flex flex-col">
      <div className="text-red-500 text-xs font-bold uppercase tracking-widest mb-2">{subtitle}</div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed flex-1">{desc}</p>
    </div>
  </motion.div>
);

const Contact = () => (
  <section id="contact" className="py-32 px-4 text-center bg-zinc-900/20">
    <div className="max-w-4xl mx-auto">
      <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tighter">Let's Connect the Dots.</h2>
      <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">Whether you have a wicked problem that needs untangling, or you just want to know how I coded the spider chasing your mouse.</p>
      <div className="flex flex-col md:flex-row gap-6 justify-center mb-16">
        <a href="mailto:yitzy@bitzyspider.com" className="bg-white text-black text-lg px-8 py-4 rounded-full font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 cursor-none">
          <Mail size={20} /> yitzy@bitzyspider.com
        </a>
        <a href="tel:3044494899" className="bg-zinc-900 text-white border border-zinc-800 text-lg px-8 py-4 rounded-full font-bold hover:border-white transition-all flex items-center justify-center gap-2 cursor-none">
          <span className="font-mono">(304) 44-YITZY</span>
        </a>
      </div>
      <div className="text-xs font-mono text-zinc-600 uppercase tracking-[0.2em]">Status: Currently creating order out of chaos</div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="py-12 px-6 border-t border-zinc-900 bg-black">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
      <div className="flex items-center gap-2">
        <Globe className="text-zinc-600" />
        <span className="font-bold text-zinc-600">BITZYSPIDER.COM</span>
      </div>
      <div className="text-zinc-600 text-sm">© {new Date().getFullYear()} Yitzy Rosenberg. All rights reserved.</div>
    </div>
  </footer>
);
