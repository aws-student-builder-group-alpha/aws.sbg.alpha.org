"use client"

import Link from "next/link"
import { ArrowDown, ArrowRight } from "lucide-react"
import MeshGradient from "./mesh-gradient"
import AwsBuildMark from "./aws-build-mark"
import PhotoCarousel from "./photo-carousel"
import { RECRUITMENT_URL } from "@/lib/recruitment"
import "./hero.css"

export default function Hero() {
 return <section className="alpha-hero" data-theme="dark" aria-labelledby="alpha-hero-heading">
  <div className="alpha-hero-gradient" aria-hidden="true"><MeshGradient /></div>
  <div className="alpha-hero-content">
   <div className="alpha-hero-copy">
    <AwsBuildMark />
    <p className="alpha-hero-code-label" aria-hidden="true"><span>~/aws/alpha</span> · build together<span className="alpha-terminal-cursor">_</span></p>
    <h1 id="alpha-hero-heading" aria-label="AWS Student Builder Group Alpha"><span className="alpha-hero-heading-line">Student Builder</span><span className="alpha-hero-heading-line">Group <span className="alpha-hero-name"><span className="alpha-code-bracket" aria-hidden="true">&lt;</span>Alpha<span className="alpha-code-bracket" aria-hidden="true"> /&gt;</span></span></span></h1>
    <p className="alpha-hero-description">Have a community that supports your career, learn with peers, and accelerate your cloud career with us.</p>
    <div className="alpha-hero-actions">
     <a className="alpha-hero-primary" href={RECRUITMENT_URL + "/opportunities"}>Be a Member Here! <ArrowRight size={20} aria-hidden="true" /></a>
     <Link className="alpha-hero-secondary" href="/#about">How you can grow with us <ArrowDown size={17} aria-hidden="true" /></Link>
    </div>
   </div>
   <PhotoCarousel />
  </div>
 </section>
}
