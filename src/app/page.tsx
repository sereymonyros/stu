
import Image from "next/image";
import { search } from "@/app/actions";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { SearchBox } from "@/components/search-box";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'cambodia-hero');

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="relative flex-1 flex flex-col items-center justify-center overflow-hidden p-4 text-center">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover z-0"
            data-ai-hint={heroImage.imageHint}
            priority
          />
        )}
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm z-10" />

        <div className="z-20 flex flex-col items-center space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl md:text-7xl drop-shadow-md">
              Cambodia Hub
            </h1>
            <p className="max-w-xl text-lg text-foreground/90 sm:text-xl md:text-2xl drop-shadow">
              Your personal AI guide to the Kingdom of Wonder. Explore, buy, sell, and find jobs.
            </p>
          </div>

          <div className="w-full max-w-xl px-4">
            <SearchBox searchAction={search} />
          </div>
        </div>
      </main>
    </div>
  );
}
