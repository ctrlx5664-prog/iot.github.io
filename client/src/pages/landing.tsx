import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ReactNode } from "react";
import {
  Zap,
  Shield,
  BarChart3,
  Cpu,
  Globe,
  Clock,
  ChevronRight,
  Building2,
  Lightbulb,
  MonitorSmartphone,
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
              CtrlX
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button asChild>
              <Link href="/login">
                Dashboard
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-sm font-medium mb-8">
              <Cpu className="w-4 h-4" />
              Next-Generation IoT Platform
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Smart Control for your{" "}
              <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
                Business
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
              CtrlX provides complete IoT management solutions for businesses
              looking to automate, monitor, and control their devices
              intelligently and securely.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="px-8">
                <Link href="/login">
                  Access Dashboard
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="px-8">
                <Link href="/register">Create Free Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why choose CtrlX?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We combine cutting-edge technology with ease of use to transform
              how you manage your IoT devices.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Advanced Security"
              description="Two-factor authentication, data encryption, and granular access control to protect your infrastructure."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Real-Time Analytics"
              description="Interactive dashboards with real-time metrics for informed decision-making."
            />
            <FeatureCard
              icon={<Globe className="w-6 h-6" />}
              title="Global Access"
              description="Access your devices from anywhere in the world through an intuitive web interface."
            />
            <FeatureCard
              icon={<Building2 className="w-6 h-6" />}
              title="Multi-Organization"
              description="Manage multiple companies and locations on a single platform with custom permissions."
            />
            <FeatureCard
              icon={<Lightbulb className="w-6 h-6" />}
              title="Smart Automation"
              description="Create rules and automations to optimize energy consumption and daily operations."
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="24/7 Availability"
              description="Robust cloud infrastructure ensuring continuous availability of your systems."
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 text-center">
            <StatCard value="99.9%" label="Guaranteed Uptime" />
            <StatCard value="24/7" label="Technical Support" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
        <div className="max-w-3xl mx-auto text-center">
          <MonitorSmartphone className="w-16 h-16 mx-auto mb-6 text-cyan-500" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to transform your business?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join hundreds of companies that already trust CtrlX to manage their
            IoT devices.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="px-8">
              <Link href="/register">
                Get Started
                <ChevronRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <a href="mailto:contact@ctrlx.pt">Talk to Our Team</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">CtrlX</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} CtrlX. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-background border shadow-sm hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent mb-2">
        {value}
      </div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}
