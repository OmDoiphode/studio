import { Button } from '@/components/ui/button';
import { placeHolderImages } from '@/lib/placeholder-images';
import { ArrowRight, Bot, GraduationCap, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const heroImage = placeHolderImages.find((img) => img.id === 'hero');

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-card">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              {heroImage && (
                <Image
                  alt="Hero"
                  className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square"
                  data-ai-hint={heroImage.imageHint}
                  height="600"
                  src={heroImage.imageUrl}
                  width="600"
                />
              )}
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                    Effortless Attendance with FaceAttend
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    The smart attendance system powered by AI. Streamline your classroom management, save time, and gain valuable insights.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href="/signup">
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/login">
                      Faculty Login
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Everything You Need for Smart Attendance</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  FaceAttend offers a comprehensive suite of tools for both faculty and students to make attendance tracking seamless and intelligent.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none mt-12">
              <div className="grid gap-1 text-center p-6 rounded-lg hover:bg-card transition-colors">
                <Users className="h-8 w-8 mx-auto text-primary" />
                <h3 className="text-lg font-bold font-headline">Role-Based Access</h3>
                <p className="text-sm text-muted-foreground">
                  Separate, secure dashboards for Faculty and Students ensures everyone has access to the right tools.
                </p>
              </div>
              <div className="grid gap-1 text-center p-6 rounded-lg hover:bg-card transition-colors">
                <GraduationCap className="h-8 w-8 mx-auto text-primary" />
                <h3 className="text-lg font-bold font-headline">Easy Class Management</h3>
                <p className="text-sm text-muted-foreground">
                  Faculty can create classes, generate unique codes, and manage student enrollments with just a few clicks.
                </p>
              </div>
              <div className="grid gap-1 text-center p-6 rounded-lg hover:bg-card transition-colors">
                <Bot className="h-8 w-8 mx-auto text-primary" />
                <h3 className="text-lg font-bold font-headline">AI-Powered Summaries</h3>
                <p className="text-sm text-muted-foreground">
                  Leverage GenAI to get instant summaries of attendance data, highlighting trends and students who need support.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 FaceAttend. All rights reserved.</p>
      </footer>
    </div>
  );
}
