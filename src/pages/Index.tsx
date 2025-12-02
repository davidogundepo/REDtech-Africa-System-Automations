import { Mail, Github, Linkedin, ArrowDown } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glow effect */}
      <div className="fixed inset-0 hero-glow pointer-events-none" />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 md:px-12">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <span className="font-display text-xl tracking-wide text-foreground">D.</span>
          <div className="flex gap-8">
            <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300">About</a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300">Contact</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center items-center px-6 relative">
        <div className="text-center max-w-4xl mx-auto">
          <p className="text-primary font-body text-sm tracking-[0.3em] uppercase mb-6 animate-fade-up">
            Welcome
          </p>
          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl font-medium tracking-tight mb-8 animate-fade-up-delay">
            David
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed animate-fade-up-delay-2">
            Creative thinker. Problem solver. Passionate about crafting meaningful experiences and bringing ideas to life.
          </p>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-float">
          <ArrowDown className="w-5 h-5 text-muted-foreground" />
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-primary font-body text-sm tracking-[0.2em] uppercase mb-4 block">About</span>
              <h2 className="font-display text-4xl md:text-5xl font-medium mb-6">
                A bit about me
              </h2>
            </div>
            <div>
              <p className="text-muted-foreground leading-relaxed mb-6">
                I believe in the power of simplicity and attention to detail. Every project is an opportunity to create something that resonates and makes a difference.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                When I'm not working, you'll find me exploring new ideas, reading, or enjoying the outdoors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Contact Section */}
      <section id="contact" className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-primary font-body text-sm tracking-[0.2em] uppercase mb-4 block">Get in Touch</span>
          <h2 className="font-display text-4xl md:text-5xl font-medium mb-6">
            Let's connect
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-12">
            I'm always open to new opportunities and interesting conversations.
          </p>
          
          <div className="flex justify-center gap-6">
            <a 
              href="mailto:hello@david.com" 
              className="p-4 rounded-full border border-border bg-secondary/50 hover:bg-secondary hover:border-primary/50 transition-all duration-300 group"
              aria-label="Email"
            >
              <Mail className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
            <a 
              href="#" 
              className="p-4 rounded-full border border-border bg-secondary/50 hover:bg-secondary hover:border-primary/50 transition-all duration-300 group"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
            <a 
              href="#" 
              className="p-4 rounded-full border border-border bg-secondary/50 hover:bg-secondary hover:border-primary/50 transition-all duration-300 group"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-display text-lg text-foreground">David</span>
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
